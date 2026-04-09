const express=require('express')
const app=express();
require('dotenv').config();
const connect=require('./connection/connection')
const cors=require('cors')
app.use(cors())
const bcrypt=require('bcryptjs')
const webhookRoute=require('./routes/webhook')
app.use(webhookRoute)
app.use(express.json())
const authRoutes=require('./routes/auth')
const trendRoutes=require('./routes/trend')
const accountRoutes=require('./routes/account')
const subscriptionRoutes=require('./routes/subscription')

const adminRoutes=require('./routes/admin')
const watchlistRoutes=require('./routes/watchlist')
const Admin=require('./models/admin')

async function createAdmin() {
    const email = "admin@example.com";
    const password = "yourpassword123";
  
    const admin = await Admin.create({ 
      email, 
      password: await bcrypt.hash(password, 10) 
    });
  
    console.log('Admin created:', admin);
  }
  
//   createAdmin();

app.use('/uploads/images', express.static('/tmp/public/files/images'));
app.use('/uploads/videos', express.static('/tmp/public/files/videos'));
app.use('/uploads', express.static('/tmp/public/files/images'));
app.use(authRoutes)
app.use(trendRoutes)
app.use(accountRoutes)
app.use(subscriptionRoutes)
app.use(watchlistRoutes)
app.use('/admin',adminRoutes)
connect

app.listen(5000,()=>{
    console.log("Listening to port 5000")
})