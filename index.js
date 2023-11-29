const express = require('express')
const bodyParser = require("body-parser");

const UserRoutes =  require("./modules/user/user.routes")
const RoleRoutes =  require("./modules/role/role.routes")
const PermissionRoutes =  require("./modules/permission/permission.routes")
const UserRoleRoutes =  require("./modules/user_role/user_role.routes")
const UserPermissionRoutes =  require("./modules/user_permission/user_permission.routes")
const ApplicationRoutes =  require("./modules/application/application.routes")
const ApplicationReviewRoutes =  require("./modules/application_review/application_review.routes")
const AttachmentRoutes =  require("./modules/attachment/attachment.routes")

const cors = require('cors')
const app = express()
app.use(cors());
app.use(express.json());
app.use(express.static("files"));
app.use(bodyParser.text({ type: "/" }));

app.use("/user",UserRoutes)
app.use("/role",RoleRoutes)
app.use("/permission",PermissionRoutes)
app.use("/user_role",UserRoleRoutes)
app.use("/user_permission",UserPermissionRoutes)
app.use("/application",ApplicationRoutes)
app.use("/application_review",ApplicationReviewRoutes)
app.use("/attachment",AttachmentRoutes)

app.get('/',(req,res)=>{
    res.send("Anza management system API's are okay!")
})
app.listen(5000,()=>{
  console.log("Server started at port 5000")
})