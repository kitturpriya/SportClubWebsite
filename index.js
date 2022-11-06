const express = require('express');
var mysql = require('mysql');

var parseUrl = require('body-parser');
const app = express();


let encodeUrl = parseUrl.urlencoded({ extended: false });
app.use(express.static("public"))

app.get('/', (req, res)=>{
   res.sendFile(__dirname+"/public/"+"home.html")
});

app.get('/contact', (req, res)=>{
    res.sendFile(__dirname+"/public/contact/"+"index.html")
 });

var con = mysql.createConnection({
    host: "localhost",
    user: "root", // my username
    password: "admin", // my password
    database: "booking_details"
});

 app.post('/form', encodeUrl, (req, res) => {
    var name = req.body.name;
    var ph = req.body.phone;
    var mail = req.body.email;
    var subj = req.body.subject;
    var mess = req.body.message;
   
    
    var sql = `INSERT INTO form_details (name,email, phone, subject, message) VALUES ('${name}', '${mail}', '${ph}', '${subj}','${mess}')`;
    con.query(sql, function (err, result) {
          if (err) {
              throw err;

          }
          res.redirect('/');
          //console.log(result.affectedRows + " record(s) updated");
        });
    





});







app.listen(4000, ()=>{
   console.log("Server running on port 4000");
});