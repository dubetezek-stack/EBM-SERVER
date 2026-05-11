const bcrypt = require('bcryptjs');
const hash = '$2a$10$23M6HUdOA7nD8YKyMYkmXuUkYYEJQ8zTsSppvswc1N1kDszc6DwKC';
const password = 'admin';

bcrypt.compare(password, hash, (err, res) => {
    console.log('Password match:', res);
});
