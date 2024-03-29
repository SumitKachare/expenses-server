import jwt from "jsonwebtoken"
import ApiError from "./errorClass.js"
import client from "../config/redis.config.js"


export const generateAccessToken = async (userId) => {

    // load access secret from env
    const accessSecret = process.env.JWT_ACCESS_SECRET

    if (!accessSecret) {
        throw new ApiError("Token generation error" , 500)
    }

    // promisify access token
    return new Promise((resolve , reject)=>{

        // sign access token
        jwt.sign({id : userId} ,accessSecret , {
            expiresIn : process.env.JWT_ACCESS_EXPIRY
        } , function ( err , token) {

            // callback
            if (err) {
                reject(err)
            }

            resolve(token)
           
        })
    })
    
} 



export const generateRefreshToken = (userId) => {

    // load access secret from env
    const refreshSecret = process.env.JWT_REFRESH_SECRET

    if (!refreshSecret) {
        throw new ApiError("Token generation error" , 500)
    }

    // promisify access token
    return new Promise((resolve , reject)=>{

        // sign access token
        jwt.sign({id : userId} ,refreshSecret , {
            expiresIn : process.env.JWT_REFRESH_EXPIRY
        } ,  ( err , token) => {

            // callback
            if (err) {
                reject(err)
            }

            // sae the user and token to redis db 
            client.setEx(userId, 365 * 24 * 60 * 60, token ).then((data)=>{

                // if saved succesfully then resolve the token
                resolve(token)

            }).catch((err)=>{
                reject(new ApiError())
            }) 

        })
    })
    
} 


export const verifyAccessJwt = (token) => {

    const accessSecret = process.env.JWT_ACCESS_SECRET


    return new Promise((resolve , reject)=>{
        jwt.verify(token  , accessSecret , (err , data)=>{
            if (err) {
                reject(err)
            }

            resolve(data.id)
        })
    })
} 


export const verifyRefreshJwt = (token) => {

    const refreshSecret = process.env.JWT_REFRESH_SECRET

    return new Promise((resolve , reject)=>{
        jwt.verify(token  , refreshSecret , (err , data)=>{
            if (err) {
                return reject(err)
            }

            const userId = data.id
            // check weather the refreshtoken exist in redis
            client.get(userId).then((data)=>{
                // check the incoming token with the token in redis under that user id
                if (token === data) {
                    
                    return resolve(userId)
                }else{
                    return reject(new ApiError("Unauthorized" , 401))
                }
            }).catch((err)=>{
                return reject(new ApiError())
            })

           
        })
    })
} 


export const generateJWTUtilToken = (data , type) => {

    let secret 
    let expiry

    const emailSecret = process.env.JWT_INVITE_SECRET
    const forgetSecret = process.env.JWT_FORGET_SECRET

    const emailExpiry = process.env.JWT_INVITE_EXPIRY
    const forgetExpiry = process.env.JWT_FORGET_EXPIRY

    if (type === "category-invite") {
        secret = emailSecret
        expiry =  emailExpiry
    }  
    
    if(type === "forget-password"){
        secret = forgetSecret
        expiry = forgetExpiry
    }

    

    return new Promise((resolve , reject)=>{
        jwt.sign({data} , secret , {expiresIn : expiry} , (err , token)=>{
            if (err) {
                reject(err)
            }

            resolve(token)
        })
    })

}

export const verifyJWTUtilToken = (token , type) => {

    let secret 

    const emailSecret = process.env.JWT_INVITE_SECRET
    const forgetSecret = process.env.JWT_FORGET_SECRET

    if (type === "category-invite") {
        secret = emailSecret
    }  
    
    if(type === "forget-password"){
        secret = forgetSecret
    }

    return new Promise((resolve , reject)=>{
        jwt.verify(token , secret , (err , token)=>{
            if (err) {
                console.log("err" , err);
                if (err.name === "TokenExpiredError") {
                    reject(new ApiError("Token Expired" , 401))
                }else{
                    reject(new ApiError("Token Denied" , 401))
                }
            }

            resolve(token)
        })
    })

}