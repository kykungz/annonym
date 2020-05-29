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
        'แลนด์ ปิกอัพจิ๊กโก๋กลาส โบว์ ไนน์ริคเตอร์ฮ็อตด็อกหมิง อุรังคธาตุ ไฮบริดมอคค่าท็อปบู๊ทเวิร์ลด์จตุคาม ป๊อปอาร์พีจีแซ็กโซโฟนเอ็กซ์เพรสน้องใหม่ มอยส์เจอไรเซอร์ ป๊อปอึ๋มคีตกวี กลาสอึมครึม ผู้นำ สมิติเวชพาสปอร์ต กัมมันตะกรอบรูปมาร์จินบัลลาสต์ไอซ์ เวณิกาแบล็คบอดี้ แอปเปิ้ลติ่มซำซิม จ๊อกกี้คอลัมนิสต์',
    },
    {
      userId: 2,
      content:
        'พรีเมียร์ซิมหมิง กรอบรูปซัพพลายเออร์สโรชา มาร์ก เก๊ะบูติคสถาปัตย์รีทัช ท็อปบูตเวิร์ลด์ ไวอากร้าภูมิทัศน์ โบว์เจี๊ยววาทกรรมง่าว ไรเฟิลเอาท์ดอร์บอดี้เจ๊ รีทัชชินบัญชรทำงานโปรเทรด ไทม์ ควีนจังโก้ โปลิศแมกกาซีนฟินิกซ์แฮนด์ เชฟแคมเปญ มวลชนเกสต์เฮาส์โค้ช ลิสต์สโตร์เลิฟบริกรแชมปิยอง โปลิศ',
    },
    {
      userId: 1,
      content:
        'ทอล์คซิ้มเบลอแรลลี่โปรเจกเตอร์ แคร็กเกอร์ไทยแลนด์ แพนงเชิญคอร์ปแพนงเชิญ เอ็นเตอร์เทนรัม สุนทรีย์เทเลกราฟง่าวยากูซ่ารีสอร์ท วอเตอร์แคร็กเกอร์ยะเยือกเวิร์กท็อปบู๊ท ออสซี่ นางแบบแคมปัส สมาพันธ์ แฮปปี้เท็กซ์โรแมนติก เกจิโปรเจคท์อุปทาน เวิร์กช็อปเท็กซ์แพทเทิร์นเทียมทานไฮบริด เกสต์เฮาส์ วิน ป๊อปรีพอร์ทเลกเชอร์เวิร์ค กราวนด์มาร์จินสี่แยกแม็กกาซีน',
    },
    {
      userId: 1,
      content:
        'สปาเกรย์ธุหร่ำแดนเซอร์ อุปสงค์โลชั่นอีแต๋นนาฏยศาลาโอเปอเรเตอร์ จิ๊กโก๋หมั่นโถวโมเดลเยน มวลชนยังไงเอ๋อะโปรโมเตอร์ แจ๊กพอตคอนแทคราชานุญาต ตะหงิด เกย์รัมโรลออนเรซิน ดิสเครดิตจอหงวน แคทวอล์คเลิฟ บุญคุณเมี่ยงคำแคมเปญเกรด โบกี้ มอคคาออสซี่คัตเอาต์โมเต็ลพะเรอ หน่อมแน้มโก๊ะทอร์นาโดม็อบต่อยอด ดีเจ มยุราภิรมย์เอ็กซ์โป เอ็นเตอร์เทน',
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
