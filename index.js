const express = require('express')
const bodyParser = require("body-parser");



const cors = require('cors')
const app = express()
app.use(cors());
app.use(express.json());
app.use(express.static("files"));
app.use(bodyParser.text({ type: "/" }));


app.get('/',(req,res)=>{
    res.send("Anza management system API's are okay!")
})
app.listen(5000,()=>{
  console.log("Server started at port 5000")
})