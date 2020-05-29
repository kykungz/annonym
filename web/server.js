const express = require('express')
const cors = require('cors')
const path = require('path')
const multer = require('multer')

const database = require('./database')
const config = require('../keys/config')
const { s3 } = require('./s3')

const {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} = require('unique-names-generator')

const upload = multer()

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

app.get('/posts', async (req, res) => {
  const results = await database.connection.execute(
    `SELECT Posts.id, Posts.content, Posts.photo_key as photoKey, Posts.date as postDate, Users.name as author FROM Posts JOIN Users ON Posts.user_id=Users.id`,
  )

  const posts = results[0].map((item) => {
    if (!item.photoKey) return item

    const TEN_MINUTES = 60 * 10

    const signedPhotoUrl = s3.getSignedUrl('getObject', {
      Key: item.photoKey,
      Expires: TEN_MINUTES,
    })

    return {
      ...item,
      photoUrl: signedPhotoUrl,
    }
  })

  res.send(posts)
})

app.post('/create', async (req, res) => {
  const name = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    style: 'capital',
    separator: ' ',
  })

  const [result] = await database.connection.execute(`
    INSERT INTO Users (name)
    VALUES ('${name}');
  `)

  console.log(result)

  res.send({ id: result.insertId, name })
})

app.post('/upload', upload.single('photo'), (req, res) => {
  const Key = `${Date.now()}-${req.file.originalname}`

  s3.upload({ Key, Body: req.file.buffer }, (err, data) => {
    if (err) {
      res.status(500).send('Uploading error')
    }

    res.send({ photoKey: data.key })
  })
})

app.post('/post', async (req, res) => {
  console.log(req.body)

  const { userId, content, photoKey } = req.body

  await database.connection.execute(
    `
    INSERT INTO Posts (user_id, content, photo_key)
    VALUES (${userId}, '${content}', ?);
  `,
    [photoKey],
  )

  res.send({ success: true })
})

app.get('/clear', async (req, res) => {
  try {
    await database.connection.execute(`DROP TABLE Users;`)
  } catch (error) {}

  try {
    await database.connection.execute(`DROP TABLE Posts;`)
  } catch (error) {}

  try {
    await database.connection.execute(`
    CREATE TABLE Users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      register_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  } catch (err) {}

  try {
    await database.connection.execute(`
    CREATE TABLE Posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      photo_key TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    CHARACTER SET utf8 COLLATE utf8_unicode_ci;
  `)
  } catch (err) {}

  const names = Array(8)
    .fill(0)
    .map((item) =>
      uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        style: 'capital',
        separator: ' ',
      }),
    )

  const posts = [
    {
      userId: 5,
      content:
        'I usually try to keep my weekends work-free but I’ve got some to crack on with today. However, I really don’t mind because my new keyboard, mouse and stand just arrived... It’s like Christmas all over again!',
    },
    {
      userId: 2,
      content: `One more month until I can see my friends again... Let's do this gamers!!`,
    },
    {
      userId: 1,
      content: 'save lives keep distance wash your mask and wear masks 🙏🏼🙏🏼🙏🏼',
    },
  ]

  await database.connection.execute(`
    INSERT INTO Users (name)
    VALUES ${names.map((name) => `('${name}')`)};
  `)

  await database.connection.execute(`
    INSERT INTO Posts (user_id, content)
    VALUES ${posts.map((post) => `(${post.userId},'${post.content}')`)};
  `)

  res.send({ success: true })
})

app.listen(config.PORT, async () => {
  await database.connect()
  console.log('Server started on port', config.PORT)
})
