import express from "express";
import http from "http";
import mongoose from "mongoose";
import multer from "multer";
import { v2 as cloudinary} from 'cloudinary';
import * as dotenv from 'dotenv';
import streamify from 'streamifier';

dotenv.config();

console.clear()

/**
 * async function to connect to mongodb server.
 */
const connectToDb = async () => {
  mongoose.connect(process.env.MONGO_URL);
}


/**
 * Document definition for data being stored.
 */
const postSchema = mongoose.Schema({
  caption: {
    type: String,
  },
  image: {
    type:String
  }
});

/**
 * Model for performing database interactions
 */
const posts = mongoose.model('posts', postSchema);

/**
 * Cloudinary sdk configurations.
 */
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});

/**
 * Spinning up an express application 
 * and adding middlewares to work with 
 * json data and url encoded data.
 */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

/**
 * Middleware for working with files uploaded
 * to the server. The files are not being stored
 * on the server file system but the memory
 * (ie not persistent).
 */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * method to retrieve link to image uploaded
 *  to this server.
 */
app.get('/api/posts', async (req, res) => {
  console.log(req.body);
  const caption = req.body.caption;

  console.log(caption);
  // find the post with the give caption.
  const post = await posts.findOne({ caption });

  // return the image link if post exists.
  res.send({ data: [post?.image] });
});

/**
 * Endpoint to create a post with an image.
 */
app.post('/api/posts', upload.single('image'), async (req, res) => {
  // function to upload the image file.
  function streamUploadFile(buffer) {
    return new Promise((resolve, reject) => {
      const cloud_upload_stream = cloudinary.uploader.upload_stream({
        folder: 'test',
        public_id: req.file.originalname,
        resource_type: 'image',
        upload_preset: 'test_uploads'
      },
      function(err, result){ 
        if(err) reject("ERROR", err);
        resolve(result);
      }
    )
      
    streamify.createReadStream(buffer).pipe(cloud_upload_stream);
    })
  }
  const result = await streamUploadFile(req.file.buffer);
  
  // create a new post.
  const p = new posts({
    caption: req.body.caption,
    image: result.secure_url,
  })
  await p.save()
  res.json({ msg: "post created succesfully" });
});


connectToDb()
.then(() => {
  console.log('Database connection established');
  http.createServer(app)
    .listen(3000, () => {
      console.log('👂 on port 3000');
    });
});
