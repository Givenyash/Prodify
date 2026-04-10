from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Management
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Auth Helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Brute force protection
async def check_brute_force(ip: str, email: str):
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt:
        if attempt.get("locked_until") and attempt["locked_until"] > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
        if attempt.get("attempts", 0) >= 5:
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}}
            )
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

async def record_failed_attempt(ip: str, email: str):
    identifier = f"{ip}:{email}"
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$inc": {"attempts": 1}, "$set": {"last_attempt": datetime.now(timezone.utc)}},
        upsert=True
    )

async def clear_failed_attempts(ip: str, email: str):
    identifier = f"{ip}:{email}"
    await db.login_attempts.delete_one({"identifier": identifier})

# Enums
class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Status(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

# Pydantic Models
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    priority: Priority = Priority.MEDIUM
    deadline: Optional[datetime] = None
    status: Status = Status.TODO
    tags: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    deadline: Optional[datetime] = None
    status: Optional[Status] = None
    tags: Optional[List[str]] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    priority: str
    deadline: Optional[datetime]
    status: str
    tags: List[str]
    user_id: str
    created_at: datetime
    updated_at: datetime

class TaskReorder(BaseModel):
    task_id: str
    new_status: Status
    position: int

# Create FastAPI app
app = FastAPI(title="ProdiFY API", version="1.0.0")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user: UserRegister, response: Response):
    email = user.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user.password)
    user_doc = {
        "name": user.name,
        "email": email,
        "password_hash": hashed,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "name": user.name,
        "email": email,
        "role": "user",
        "created_at": user_doc["created_at"].isoformat()
    }

@api_router.post("/auth/login")
async def login(user: UserLogin, request: Request, response: Response):
    email = user.email.lower()
    ip = request.client.host if request.client else "unknown"
    
    await check_brute_force(ip, email)
    
    db_user = await db.users.find_one({"email": email})
    if not db_user:
        await record_failed_attempt(ip, email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user.password, db_user["password_hash"]):
        await record_failed_attempt(ip, email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await clear_failed_attempts(ip, email)
    
    user_id = str(db_user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "name": db_user["name"],
        "email": email,
        "role": db_user.get("role", "user"),
        "created_at": db_user["created_at"].isoformat() if db_user.get("created_at") else None
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["_id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user.get("role", "user"),
        "created_at": current_user["created_at"].isoformat() if current_user.get("created_at") else None
    }

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ==================== TASK ROUTES ====================

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    status: Optional[Status] = None,
    priority: Optional[Priority] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["_id"]}
    
    if status:
        query["status"] = status.value
    if priority:
        query["priority"] = priority.value
    if tag:
        query["tags"] = tag
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("position", 1).to_list(1000)
    return tasks

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    # Get max position for the status column
    max_pos = await db.tasks.find_one(
        {"user_id": current_user["_id"], "status": task.status.value},
        sort=[("position", -1)]
    )
    position = (max_pos.get("position", 0) + 1) if max_pos else 0
    
    task_doc = {
        "id": str(ObjectId()),
        "title": task.title,
        "description": task.description or "",
        "priority": task.priority.value,
        "deadline": task.deadline,
        "status": task.status.value,
        "tags": task.tags,
        "user_id": current_user["_id"],
        "position": position,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.tasks.insert_one(task_doc)
    task_doc.pop("_id", None)
    return task_doc

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": current_user["_id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: TaskUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id, "user_id": current_user["_id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
    if "priority" in update_data:
        update_data["priority"] = update_data["priority"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@api_router.post("/tasks/reorder")
async def reorder_task(reorder: TaskReorder, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": reorder.task_id, "user_id": current_user["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_status = reorder.new_status.value
    
    # Update task status and position
    await db.tasks.update_one(
        {"id": reorder.task_id},
        {"$set": {"status": new_status, "position": reorder.position, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Task reordered"}

@api_router.get("/tasks/stats/summary")
async def get_task_stats(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": current_user["_id"]}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    results = await db.tasks.aggregate(pipeline).to_list(10)
    
    stats = {"todo": 0, "in_progress": 0, "done": 0}
    for r in results:
        stats[r["_id"]] = r["count"]
    
    total = sum(stats.values())
    progress = (stats["done"] / total * 100) if total > 0 else 0
    
    # Count overdue tasks
    overdue = await db.tasks.count_documents({
        "user_id": current_user["_id"],
        "status": {"$ne": "done"},
        "deadline": {"$lt": datetime.now(timezone.utc)}
    })
    
    return {
        "total": total,
        "todo": stats["todo"],
        "in_progress": stats["in_progress"],
        "done": stats["done"],
        "progress": round(progress, 1),
        "overdue": overdue
    }

# ==================== TAGS ROUTES ====================

@api_router.get("/tags")
async def get_tags(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": current_user["_id"]}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.tasks.aggregate(pipeline).to_list(100)
    return [{"name": r["_id"], "count": r["count"]} for r in results]

# Health check
@api_router.get("/")
async def root():
    return {"message": "ProdiFY API is running", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.tasks.create_index([("user_id", 1), ("status", 1)])
    await db.tasks.create_index([("user_id", 1), ("position", 1)])
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")
    
    # Write test credentials
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# ProdiFY Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/refresh\n\n")
        f.write("## Task Endpoints\n")
        f.write("- GET /api/tasks\n")
        f.write("- POST /api/tasks\n")
        f.write("- GET /api/tasks/{task_id}\n")
        f.write("- PUT /api/tasks/{task_id}\n")
        f.write("- DELETE /api/tasks/{task_id}\n")
        f.write("- POST /api/tasks/reorder\n")
        f.write("- GET /api/tasks/stats/summary\n")
    
    logger.info("ProdiFY API started successfully")

@app.on_event("shutdown")
async def shutdown():
    client.close()
