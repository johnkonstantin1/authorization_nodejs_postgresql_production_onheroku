const { request } = require("express");
const express = require("express");
const pool = require("./dbconfig").pool;
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");

const initialPassport = require("./passportconf");

initialPassport(passport);

const app = express();

const PORT = process.env.PORT || 4000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get("/", (req, res) => {
  res.render("index");
});

// app.get("/users/register", checkAuthenticated, (req, res) => {
//   res.render("register");
// });
app.get("/users/register", checkAuthenticated, (req, res) => {
  pool.query(`SELECT * FROM countries`, (err, result) => {
    if (err) {
      throw err;
    }

    res.render("register", { countries: result.rows });
  });
});

app.get("/users/login", checkAuthenticated, (req, res) => {
  res.render("login");
});

app.get("/users/dashboard", checknotAuthenticated, (req, res) => {
  res.render("dashboard", { user: req.user.name, email: req.user.email });
});

// app.get("/users/logout", (req, res) => {
//   req.logOut();
//   req.flash("yesss_message", "You have logout from your account");
//   res.redirect("/users/login");
// });
app.get("/users/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      throw err;
    }
    req.flash("yesss_message", "You have logout from your account");
    res.redirect("/users/login");
  });
});

app.post("/users/register", async (req, res) => {
  let { name, email, password, password2, birthdate, country } = req.body;
  console.log({ name, email, password, password2, birthdate, country });
  let country_id = req.body.country;
  let errors = [];
  //validation
  if (!name || !email || !password || !password2) {
    errors.push({ message: "Uncorrect input or not entered all fields" });
  }
  //password validation
  if (password.length < 6) {
    errors.push({
      message:
        "Uncorrect input of password, a password should be longer than 6 characters",
    });
  }

  if (password != password2) {
    errors.push({ message: "Passwords mismatch" });
  }

  if (errors.length > 0) {
    res.render("register", { errors, countries });
  } else {
    let hashedPass = await bcrypt.hash(password, 10);
    console.log(hashedPass);

    pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
      (err, result) => {
        if (err) {
          throw err;
        }

        console.log(result.rows);
        //email already
        if (result.length > 0) {
          errors.push({ message: "This email already have used!" });
          res.render("register", { errors });
        } else {
          pool.query(
            `INSERT INTO users (name, email, password, birthdate, country_id)
                VALUES($1, $2, $3, $4, $5)
                RETURNING id, password`,
            [name, email, hashedPass, birthdate, country_id],
            (err, result) => {
              if (err) {
                throw err;
              }
              console.log(result.rows);
              req.flash(
                "yesss_message",
                "You now have an new account! You need to login"
              );
              res.redirect("/users/login");
            }
          );
        }
      }
    );
  }
});

app.post(
  "/users/login",
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checknotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
