import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true
        },
        email:{
            type:String,
            required:true,
            unique:true
        },
        password:{
            type:String,
            required:true,
            minlength:6
        },
        profileImage:{
            type:String,
            default:""
        },
        role:{
            type:String,
            enum:["student", "tutor", "admin"],
            default:"student"
        },
        isActive:{
            type:Boolean,
            default:true
        },
        approvalStatus:{
            type:String,
            enum:["pending", "approved", "rejected"],
            default:"approved"
        },
        rejectionReason:{
            type:String,
            default:""
        },
        tutorProfile:{
            fullName:{
                type:String
            },
            subject:{
                type:String
            },
            bio:{
                type:String
            },
            mobileNumber:{
                type:String
            },
            availability:{
                type:[{
                    day:{
                        type:String
                    },
                    from:{
                        type:String
                    },
                    to:{
                        type:String
                    },
                    isAvailable:{
                        type:Boolean,
                        default:true
                    }
                }],
                default:[]
            },
            age:{
                type:Number
            },
            price:{
                type:Number
            },
            priceType:{
                type:String,
                enum:["per_hour", "per_session"]
            },
            experienceLevel:{
                type:String,
                enum:["beginner", "intermediate", "expert"],
                default:"beginner"
            },
            kyc:{
                documentType:{
                    type:String,
                    enum:["nic", "passport"]
                },
                nicNumber:{
                    type:String,
                    default:""
                },
                passportNumber:{
                    type:String,
                    default:""
                },
                nicFrontImage:{
                    type:String,
                    default:""
                },
                nicBackImage:{
                    type:String,
                    default:""
                },
                passportImage:{
                    type:String,
                    default:""
                }
            }
        }
    }, 
    { timestamps: true }
);

//hash password before saving user to db
userSchema.pre("save", async function (){
    if(!this.isModified("password")){
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

});


//compare password func
userSchema.methods.comparePassword = async function (userPassword){
    return await bcrypt.compare(userPassword, this.password);
}

const User = mongoose.model("User", userSchema);

export default User;