require("dotenv").config();
const express = require('express');
var mysql = require('mysql');
const path = require('path');
var session=require('express-session');
var parseUrl = require('body-parser');
var flash = require('express-flash');
var nodemailer = require('nodemailer');
var randtoken = require('rand-token');
const app = express();


app.use(session({
    secret: 'secret',
    // create new redis store.
    //store: new redisStore({ host: 'localhost', port: 6379, client: client,ttl : 260}),
    saveUninitialized: true,
    resave: true
}));
app.use(flash());
const bcrypt = require("bcrypt")
app.use(express.json()) //middleware to read req.body.<params>

let encodeUrl = parseUrl.urlencoded({ extended: false });
app.use(express.static("public"))

const generateAccessToken = require("./accesstoken")

const db = mysql.createPool({
    host: "localhost",
    user: "root", // my username
    password: "admin", // my password
    database: "clubuserdb"
});

// set the view engine to ejs
app.set('view engine', 'ejs');

app.get('/', (req, res)=>{
    let sess = req.session;
    if(sess.mail) {
        return res.redirect('/home');
    }
    res.render(__dirname+"/templates/login");
});


//CREATE USER
app.post("/register", encodeUrl, async (req,res) => {
    const user = req.body.name;
    const mail=req.body.mail;
    const hashedPassword = await bcrypt.hash(req.body.password,10);
    db.getConnection( async (err, connection) => {
     if (err) throw (err)
     const sqlSearch = "SELECT * FROM users WHERE email=?"
     //search for user with existing emailid
     const search_query = mysql.format(sqlSearch,[mail])
     const sqlInsert = "INSERT INTO users VALUES (0,?,?,?,'')"
     const insert_query = mysql.format(sqlInsert,[user, hashedPassword,mail])
     // ? will be replaced by values
     // ?? will be replaced by string
     await connection.query (search_query, async (err, result) => {
      if (err) throw (err)
      console.log("------> Search Results")
      console.log(result.length)
      if (result.length != 0) {
       console.log("------> User already exists")
       res.send("Account already exists. Login to access the club resources!")
      } 
      else {
       await connection.query (insert_query, (err, result)=> {
       connection.release()
       if (err) throw (err)
       console.log ("--------> Created new User")
       res.send("Account created. Login to access the club resources!")
   
      })
      
     }
    }) 
    }) 
    }) 



//LOGIN (AUTHENTICATE USER)
app.post("/login", encodeUrl, (req, res)=> {
    const mail = req.body.checkmail;
    const pass = req.body.checkpass;
    
    db.getConnection ( async (err, connection)=> {
     if (err) throw (err)
     const sqlSearch = "SELECT * FROM users WHERE email=?"
     const search_query = mysql.format(sqlSearch,[mail])
     await connection.query (search_query, async (err, result) => {
      
      if (err) throw (err)
      if (result.length == 0) {
       console.log("--------> User does not exist")
       res.send("Account doesn't exist. Register to access the club resources !")
   

      } 
      else {
         const hashedPassword = result[0].password
         //get the hashedPassword from result
        if (await bcrypt.compare(pass, hashedPassword)) {
        console.log("---------> Login Successful")
        //console.log("---------> Generating accessToken")
        //stateless session management using JWT tokens
        // const token = generateAccessToken({user: mail})   
        // console.log(token)
        req.session.user_id=result[0].user_id;
        req.session.mail=mail;
        console.log(req.session.mail)
        
        res.send("Welcome! You have been logged in")
        } 
        else {
        console.log("---------> Password Incorrect")
        res.send("Account and Password do not match!")
     
        } 
      }
     }) 
    
    }) 
    
    }) 



//send email
function sendEmail(email, token) {
 
    var email = email;
    var token = token;
 
    var mail = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'priyankakittur557@gmail.com', // Your email id
            pass: 'apvtxpjxshvmrayu' // Your password
        }
    });
 
    var mailOptions = {
        from: 'priyankakittur557@gmail.com',
        to: email,
        subject: 'Reset Password Link - SPORTCLUB.com',
        html: '<p>You requested for password reset, kindly use this <a href="http://localhost:3000/reset-password?token=' + token + '">RESET PASSWORD</a> to reset your password</p>'
 
    };
 
    mail.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(1)
        } else {
            console.log(0)
        }
    });
}
/* forgot pass page */
app.get('/forgot-password', function(req, res, next) {
    res.render(__dirname+"/templates/forgotpass", {
    title: 'Forgot Password Page'
    });
    });

/* send reset password link in email */
app.post('/reset-password-email', encodeUrl, function(req, res, next) {
 
    
    db.getConnection ( async (err, connection)=> {
    var email = req.body.email;
    const sqlSearch = "SELECT * FROM users WHERE email=?"
    const search_query = mysql.format(sqlSearch,[email])
    connection.query(search_query, function(err, result) {
        if (err) throw err;
         
        var type = ''
        var msg = ''
     
        if (result[0].email.length > 0) {
 
           var token = randtoken.generate(20);
 
           var sent = sendEmail(email, token);
 
             if (sent != '0') {
 
                var data = {
                    token: token
                }
 
                connection.query('UPDATE users SET ? WHERE email ="' + email + '"', data, function(err, result) {
                    if(err) throw err
         
                })
 
                type = 'success';
                msg = 'The reset password link has been sent to your email address';
                
 
            } else {
                type = 'error';
                msg = 'Something went wrong. Please try again!';
            }
 
        } else {
            //console.log('2');
            type = 'error';
            msg = 'The Email is not registered with us!';
 
        }
    
        req.flash(type, msg);
        res.redirect('/forgot-password');
    });
})
})

/* reset page */
app.get('/reset-password', function(req, res, next) {
    res.render(__dirname+"/templates/resetpass", {
    title: 'Reset Password Page',
    token: req.query.token
    });
    });

/* update password to database */
app.post('/update-password', encodeUrl, function(req, res, next) {
    db.getConnection ( async (err, connection)=> {
    var token = req.body.token;
    var password = req.body.password;
    connection.query('SELECT * FROM users WHERE token ="' + token + '"', function(err, result) {
    if (err) throw err;
    var type
    var msg
    if (result.length > 0) {
    var saltRounds = 10;
    // var hash = bcrypt.hash(password, saltRounds);
    bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash(password, salt, function(err, hash) {
    var data = {
    password: hash
    }
    connection.query('UPDATE users SET ? WHERE email ="' + result[0].email + '"', data, function(err, result) {
    if(err) throw err
    });
    });
    });
    type = 'success';
    msg = 'Your password has been updated successfully!';
    } else {
    console.log('2');
    type = 'error';
    msg = 'Invalid link; please try again!';
    }
    req.flash(type, msg);
    res.redirect('/reset-password');
    });
})
    })

app.get('/logout', function(req, res){

    
    req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
        console.log("---------> Logout Successful")
        res.redirect('/');
    });
    
});

//contact form
app.post("/contactform", encodeUrl, async (req,res) => {
    const name = req.body.name;
    const ph = req.body.phone;
    const age = req.body.age;
    const subj = req.body.subject;
    const mess = req.body.message;
  
    db.getConnection( async (err, connection) => {
     if (err) throw (err)
     const sqlInsert = "INSERT INTO contactformdb VALUES (0,?,?,?,?,?)"
     const insert_query = mysql.format(sqlInsert,[name, ph,age,subj,mess])
     // ? will be replaced by values
     // ?? will be replaced by string
    
       connection.query (insert_query, (err)=> {
       connection.release()
       if (err) throw (err)
       console.log ("form submitted")
       var mail=req.session.mail;
       var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'priyankakittur557@gmail.com',
          pass: 'apvtxpjxshvmrayu'
        }
      });
      
      var mailOptions = {
        from: 'priyankakittur5570@gmail.com',
        to: mail,
        subject: 'SPORT CLUB has recieved your message!',
        html: '<p>Thank you for filling out our form. We got your response and within 2 business days, we will get in touch. Meanwhile, take a look at our our website.Feel free to follow us on social media or ask any questions.</p>'
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
       res.redirect('/home');
      })
      
     })

    }) 

   
//booking
app.post("/booking", encodeUrl, async (req,res) => {
        const date = req.body.date;
        const time= req.body.time;
        const adults = req.body.adults;
        const children = req.body.children;
        const game = req.body.game;
        var mail=req.session.mail;
    db.getConnection( async (err, connection) => {
     if (err) throw (err)
            const sqlSearch = "SELECT * FROM bookingdb WHERE bookdate=? AND booktime=? AND gametype=?"
            const search_query = mysql.format(sqlSearch,[date,time,game])
            const sqlInsert = "INSERT INTO bookingdb VALUES (0,?,?,?,?,?,?)"
            const insert_query = mysql.format(sqlInsert,[mail,date,time,adults,children,game])
     await connection.query (search_query, async (err, result) => {
      if (err) throw (err)
      console.log("------> Search Results")
      console.log(result.length)
      if (result.length != 0) {
        console.log("--------> slot unavailable")
        res.send("We are sorry for the inconvenience but this slot has already been booked,check out our other slots to make a reservation!")
      } 
      else {
       await connection.query (insert_query, (err, result)=> {
       connection.release()
       if (err) throw (err)
       console.log ("--------> slot booked")
       var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
            user: 'priyankakittur557@gmail.com',
            pass: 'apvtxpjxshvmrayu'
            }
        });
        
        var mailOptions = {
            from: 'priyankakittur5570@gmail.com',
            to: mail,
            subject: 'SPORT CLUB has recieved your reservation!',
            html: '<p>Thank you for making a reservation! <br>We look forward to your visit and hope you will be enjoying your experience at SPORT as much as we will be enjoying your company.</p>'
        };
        
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
            console.log(error);
            } else {
            console.log('Email sent: ' + info.response);
            }
        });
       res.send("Your slot has been booked!")
   
      })
      
     }
    }) 
    }) 
    }) 


//cancel booking
app.post("/cancelbooking", encodeUrl, async (req,res) => {
        const date = req.body.date;
        const time= req.body.time;
        const game = req.body.game;
        var mail=req.session.mail;
        db.getConnection( async (err, connection) => {
        if (err) throw (err)
                // const search="SELECT MAX('bookingid') FROM bookingdb ;"
                const sqlSearch = "SELECT * FROM bookingdb WHERE bookdate=? AND booktime=? AND gametype=?"
                const search_query = mysql.format(sqlSearch,[date,time,game])
                const sqldel = "DELETE FROM bookingdb WHERE bookdate=? AND booktime=? AND gametype=?"
                const del_query = mysql.format(sqldel,[date,time,game])
        await connection.query (search_query, async (err, result) => {
        if (err) throw (err)
        console.log("------> Search Results")
        console.log(result.length)
        if (result.length == 0) {
            console.log("--------> no such booking exists")
            res.send("No such booking exists. Visit our club page to book your slot now!")
        } 
        else {
        await connection.query (del_query, (err, result)=> {
        connection.release()
        if (err) throw (err)
        console.log ("--------> slot cancelled")
        var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                user: 'priyankakittur557@gmail.com',
                pass: 'apvtxpjxshvmrayu'
                }
            });
            
            var mailOptions = {
                from: 'priyankakittur5570@gmail.com',
                to: mail,
                subject: 'SPORT CLUB has recieved your cancellation request!',
                html: '<p>We are sorry to know about your cancellation. <br>We look forward to you visiting us in near future. Meanwhile you can check out our club page for other information!</p>'
            };
            
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                console.log(error);
                } else {
                console.log('Email sent: ' + info.response);
                }
            });
        res.send("Your booking has been cancelled! Visit our club page to book your convenient slot.")

        })
        
        }
        }) 
        }) 
}) 

function checkloggedin(req) {
    if(req.session.mail) {
        return true
    }
    else{
        return false
    }
}

app.get('/home', (req, res)=>{
    
    if(checkloggedin(req)) {
        res.render(__dirname+"/templates/home",{ session : req.session })
    }
    else{
        res.redirect('/');
    }
    
	

    
});
     
app.get('/contact', (req, res)=>{
    ///if(!checkloggedin(req)){res.redirect('/'); return 0} 
    if(checkloggedin(req)) {
        res.render(__dirname+"/templates/"+"contact",{ session : req.session })
    }
    else{
        res.redirect('/');
    }
    
});

app.get('/indoorgames', (req, res)=>{
    ///if(!checkloggedin(req)){res.redirect('/'); return 0} 
    if(checkloggedin(req)) {
        res.render(__dirname+"/templates/"+"page1",{ session : req.session })
    }
    else{
        res.redirect('/');
    }
    
});

app.get('/outdoorgames', (req, res)=>{
    ///if(!checkloggedin(req)){res.redirect('/'); return 0} 
    if(checkloggedin(req)) {
        res.render(__dirname+"/templates/"+"page2",{ session : req.session })
    }
    else{
        res.redirect('/');
    }    
    
});


app.get('/book', (req, res)=>{
    ///if(!checkloggedin(req)){res.redirect('/'); return 0} 
    if(checkloggedin(req)) {
        res.render(__dirname+"/templates/"+"book",{ session : req.session })
    }
    else{
        res.redirect('/');
    }    
    
});

app.get('/cancelbook', (req, res)=>{
    ///if(!checkloggedin(req)){res.redirect('/'); return 0} 
    if(checkloggedin(req)) {
        res.render(__dirname+"/templates/"+"cancelbook",{ session : req.session })
    }
    else{
        res.redirect('/');
    }    
    
});

app.get('*',(req, res)=>{
    res.send("file not found")
})
app.listen(3000, ()=>{
    console.log("Server running on port 3000");
 });