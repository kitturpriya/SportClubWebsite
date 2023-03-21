const jwt = require("jsonwebtoken")
function generateAccessToken (user) {
return jwt.sign(user, process.env.JWT_KEY, {expiresIn: "15m"})
}
module.exports=generateAccessToken