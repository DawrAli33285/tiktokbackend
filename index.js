const express=require('express')
const app=express();
require('dotenv').config();
const connect=require('./connection/connection')
const cors=require('cors')
app.use(cors())
const webhookRoute=require('./routes/webhook')
app.use(webhookRoute)
app.use(express.json())
const authRoutes=require('./routes/auth')
const trendRoutes=require('./routes/trend')
const accountRoutes=require('./routes/account')
const subscriptionRoutes=require('./routes/subscription')

const adminRoutes=require('./routes/admin')
const watchlistRoutes=require('./routes/watchlist')

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