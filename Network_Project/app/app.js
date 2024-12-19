/** @format */

var express = require('express'); //how we import packages
var path = require('path');
var fs = require('fs');
var logger = require('morgan');
const { title } = require('process');
const session = require('express-session');

var app = express(); //initiation of the web server

// view engine setup
app.set('views', path.join(__dirname, 'views')); // indicates that all the html files htb2a fe el views
app.set('view engine', 'ejs'); //handle the ejs files as html

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'))); 

var { MongoClient } = require('mongodb');

var uri = 'mongodb://127.0.0.1:27017';
var client = new MongoClient(uri);
var dbName = 'myDB';
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
var collectionName = 'myCollection';

var client1 = new MongoClient('mongodb://127.0.0.1:27017/');
var db = client1.db('myDB');
var col = db.collection('myCollection');
// await client.connect();
// const db = client.db("your-database-name");
// const collection = db.collection("users");

app.use(
	session({
		secret: 'myverystrongsecretkey',
		resave: false,
		saveUninitialized: true,
	})
);

async function checkConnection() {
	try {
		
		await client.connect();
		console.log('Connected successfully to MongoDB');

		const databasesList = await client.db().admin().listDatabases();
		console.log('Databases:');
		databasesList.databases.forEach((db) => console.log(` - ${db.name}`));
	} catch (err) {
		console.error('Error connecting to MongoDB:', err.message);
	} finally {
		
		await client.close();
		console.log('Connection closed');
	}
}




async function accessDatabase() {
	try {
		await client.connect();
		console.log('Connected successfully to MongoDB');
		const db = client.db(dbName);
		const collections = await db.listCollections().toArray();
		console.log(`Collections in database '${dbName}':`, collections);

		const collection = db.collection('myCollection');
		const result = await collection.insertOne({
			username: 'menna',
			password: 123,
			wanttogolist: {},
		});
		console.log('Document inserted:', result.insertedId);
	} catch (err) {
		console.error('Error accessing the database:', err.message);
	} finally {
		// Close the connection
		await client.close();
		console.log('Connection closed');
	}
}





// POST route for registration
app.post('/register', async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;

	if (!username || !password) {
		// Render the registration page with an error message if fields are empty
		return res.status(400).send(`<script>
            alert('Error: All fields are required!');
            window.location.href = '/registration';
        </script>`);
	}

	try {
		// Connect to MongoDB
		await client.connect();
		console.log('Connected to MongoDB');

		const db = client.db(dbName);
		const collection = db.collection(collectionName);

		// Check if the username is already taken
		const existingUser = await collection.findOne({ username: username });
		if (existingUser) {
			// render the registration page with an error message if the username is taken
			return res.status(400).send(`<script>
                alert('Error: Username is already taken!');
                window.location.href = '/registration';
            </script>`);
		}

		// Insert the new user document
		await collection.insertOne({
			username: username,
			password: password,
			wanttogolist: [],
		});

		console.log('User registered successfully');

		
		res.send(`<script>
            alert('Registration successful!');
            window.location.href = '/';
        </script>`);
		
	} catch (err) {
		console.error('Error during registration:', err.message);
		res.status(500).send('Internal Server Error');
	} finally {
		
	}
});

//------------------------------------------------------------------------------------------------

app.post('/search', function (req, res) {
	var destinations = [
		'santorini island',
		'bali island',
		'rome',
		'inca trail to machu picchu',
		'paris',
		'annapurna circuit',
	];
	var s = req.body.Search.toLowerCase();
	var searchRes = [];
	var found = false;
	if (s.trim() === '') {
		res.send(
			`<script> alert("Please enter a destination!"); window.history.back();</script>`
		);
		return;
	}
	for (let i = 0; i < destinations.length; i++) {
		if (destinations[i].includes(s)) {
			searchRes.push(destinations[i]);
			found = true;
		}
	}
	if (!found) {
		searchRes.push('empty');
		res.send(
			`<script>alert("Destination not found!"); window.history.back();</script>`
		);
		return;
	}
	res.render('searchresults', { searchRes });
	//res.redirect(dest);
});





app.post('/', async function (req, res) {
	var username1 = req.body.username;
	var password1 = req.body.password;
	//console.log("bd2na");
	// Assuming `col` is your MongoDB collection
	var userdb = await col.find().toArray();
	var user = userdb.find(
		(u) => u.username === username1 && u.password === password1
	);
	//console.log("checked");
	if (user) {
		// console.log(username1);
		req.session.loggedIn = true;
		req.session.username = username1;
		//console.log("logged in successfully");
		res.redirect('/home'); // Redirect to the home page
	} else {
		//res.render('login', { error: 'Invalid username or password' }); // Render login page with error
		res.redirect('/login?error=Invalid username or password');
	}
});

function isVerified(req, res, next) {
	// bysahel 3n typing it f kol heta, just use function w n7otaha fl get/post maben the string n function req res
	if (req.session.loggedIn) {
		return next();
	}
	res.redirect('/');
}

app.get('/home', isVerified, function (req, res) {
	res.render('home', {
		username: req.session.username,
	});
});

//------------------------------------------------------------------------------------
app.get('/', function (req, res) {
	//whenver the user request the home page ('/') then execute that function
	res.render('login');
});

app.get('/cities', isVerified, function (req, res) {
	
	res.render('cities');
});

app.get('/hiking', isVerified, function (req, res) {
	res.render('hiking');
});

app.get('/registration', function (req, res) {
	res.render('registration');
});

app.get('/searchresults', isVerified, function (req, res) {
	res.render('searchresults');
});


app.get('/islands', isVerified, function (req, res) {
	res.render('islands');
});

app.post('/add-to-want-to-go', isVerified, async (req, res) => {
	const { username, city } = req.body;

	try {
		
		const db = client.db(dbName);
		const collection = db.collection(collectionName);

		
		const result = await collection.updateOne(
			{ username: username }, // Find the user
			{ $addToSet: { wanttogolist: city } }, 
			{ upsert: true } 
		);

		// Provide a success response
		if (result.modifiedCount > 0 || result.upsertedCount > 0) {
			return res.status(200).send('City added to Want-to-Go list!');
		} else {
			return res.status(404).send('User not found!');
		}
	} catch (error) {
		console.error('Error adding to Want-to-Go list:', error);
		// Check if headers have already been sent
		if (!res.headersSent) {
			return res
				.status(500)
				.send('the destination is already in your want-to go-list!');
		}
		
		return;
	}
});


process.on('SIGINT', async () => {
	await client.close();
	console.log('MongoDB client disconnected');
	process.exit();
});

app.get('/wanttogo', isVerified, async (req, res) => {
	const username = req.session.username; // Assuming the username is stored in session after login

	if (!username) {
		return res.status(400).send('User not logged in.');
	}

	try {
		
		await client.connect();
		const db = client.db(dbName);
		const collection = db.collection(collectionName);

		
		const user = await collection.findOne({ username: username });

		if (user) {
			
			res.render('wanttogo', { wanttogolist: user.wanttogolist || [] });
		} else {
			
			res.status(404).send('User not found!');
		}
	} catch (error) {
		console.error('Error retrieving Want-to-Go list:', error);
		res
			.status(500)
			.send('An error occurred while retrieving the Want-to-Go list.');
	}
});

app.get('/hiking', isVerified, function (req, res) {
	res.render('hiking');
});
app.get('/rome', (req, res) => {
	
	const username = req.session.username; 
	res.render('rome', { username: username });
});

app.get('/paris', isVerified, function (req, res) {
	const username = req.session.username; 
	res.render('paris', { username: username });
});

app.get('/annapurna', isVerified, function (req, res) {
	const username = req.session.username; 
	res.render('annapurna', { username: username });
});

app.get('/bali', isVerified, function (req, res) {
	const username = req.session.username; 
	res.render('bali', { username: username });
});
app.get('/inca', isVerified, function (req, res) {
	const username = req.session.username; 
	res.render('inca', { username: username });
});
app.get('/santorini', isVerified, function (req, res) {
	const username = req.session.username; 
	res.render('santorini', { username: username });
});

app.get('/login', function (req, res) {
	res.render('login');
});

app.listen(3000, function () {
	console.log('Server is running on http://localhost:3000');
});
