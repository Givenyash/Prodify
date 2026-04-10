const bcrypt = require('bcryptjs');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const existingAdmin = await User.findOne({ email: adminEmail });

        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(adminPassword, salt);

            await User.create({
                name: 'Admin',
                email: adminEmail,
                passwordHash,
                role: 'admin'
            });
            console.log(`Admin user created: ${adminEmail}`);
        } else {
            // Check if password needs update
            const isMatch = await bcrypt.compare(adminPassword, existingAdmin.passwordHash);
            if (!isMatch) {
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(adminPassword, salt);
                await User.updateOne(
                    { email: adminEmail },
                    { $set: { passwordHash } }
                );
                console.log(`Admin password updated: ${adminEmail}`);
            }
        }

        // Write test credentials
        const memoryDir = '/app/memory';
        if (!fs.existsSync(memoryDir)) {
            fs.mkdirSync(memoryDir, { recursive: true });
        }

        const credentialsContent = `# ProdiFY Test Credentials

## Admin Account
- Email: ${adminEmail}
- Password: ${adminPassword}
- Role: admin

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh

## Task Endpoints
- GET /api/tasks
- POST /api/tasks
- GET /api/tasks/:taskId
- PUT /api/tasks/:taskId
- DELETE /api/tasks/:taskId
- POST /api/tasks/reorder
- GET /api/tasks/stats/summary
`;

        fs.writeFileSync(path.join(memoryDir, 'test_credentials.md'), credentialsContent);
        console.log('Test credentials written to /app/memory/test_credentials.md');

    } catch (error) {
        console.error('Error seeding admin:', error);
    }
};

module.exports = { seedAdmin };
