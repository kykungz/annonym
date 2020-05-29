let annonym = null
let file = null

const delay = (amount) => new Promise((resolve) => setTimeout(resolve, amount))

delay(800).then(() => $('#overlay-spinner').hide())

const setLoading = (isLoading) => {
  if (isLoading) {
    $('#overlay-spinner').show()
  } else {
    $('#overlay-spinner').hide()
  }
}

const loadAccount = () => {
  annonym = JSON.parse(localStorage.getItem('annonym'))

  if (annonym) {
    $('#annonymous').removeClass()
    $('#jumbotron-login').hide()
    $('#jumbotron-post').show()

    $('#name').text(annonym.name)
  }
}

const loadPosts = async () => {
  const res = await fetch('/posts')
  const posts = await res.json()
  const postsHTML = posts
    .map(
      (post) => /* html */ `
      <div class="card mb-3">
        <div class="card-body">
          <img class="img-fluid mb-4" src="${post.photoUrl}" alt=""/>
          <p>${post.content}</p>
          <p class="text-right">From: <b>${post.author}</b></p>
        </div>
      </div>
  `,
    )
    .reverse()

  $('#posts').html(postsHTML)
}

loadAccount()
loadPosts()

$('#create-post-photo-input').on('change', (e) => {
  const photo = e.target.files[0]
  const photoUrl = window.URL.createObjectURL(photo)
  if (photoUrl) {
    $('#create-post-photo').prop('src', photoUrl)
    file = photo
  }
})

$('#create-post-button-discard').on('click', () => {
  $('#create-post-photo').prop('src', '')
  $('#create-post-content').val('')
  $('#create-post-modal').modal('hide')
})

$('#create-post-button-publish').on('click', async () => {
  setLoading(true)

  const formData = new FormData()
  formData.append('photo', file)

  let res = await fetch('/upload', {
    method: 'POST',
    body: formData,
  })

  res = await res.json()

  const { photoKey } = res
  const content = $('#create-post-content').val()

  res = await fetch('/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: annonym.id, content, photoKey }),
  })

  res = await res.json()

  await loadPosts()

  setLoading(false)

  $('#create-post-photo').prop('src', '')
  $('#create-post-content').val('')
  $('#create-post-modal').modal('hide')
})

$('#create-account-button').on('click', () => {
  $('#create-account-modal').modal('show')
})

$('#create-post-button').on('click', () => {
  $('#create-post-modal').modal('show')
})

$('#create-account-button-continue').on('click', async () => {
  $('#create-account-button-continue').prop('disabled', true)

  $('#create-account-modal-content').html(/* html */ `
    <div class="text-center">
      <div class="spinner-border text-success" role="status">
        <span class="sr-only">Creating...</span>
      </div>
      <span class="h2 ml-3">Creating...</span>
    </div>
  `)

  let res = await fetch('/create', { method: 'POST' })
  res = await res.json()

  await delay(1000)

  localStorage.setItem(
    'annonym',
    JSON.stringify({
      id: res.id,
      name: res.name,
    }),
  )

  $('#create-account-button-continue').prop('disabled', false)
  $('#create-account-button-continue').text('Done')
  $('#create-account-button-continue').off()
  $('#create-account-button-continue').on('click', () => {
    $('#create-account-modal').modal('hide')
  })

  $('#create-account-modal-content').html(/* html */ `
    <div class="text-center">
      <div class="h4">You're now logged in as:</div>
      <div class="h2 text-light bg-dark p-2">${res.name}</div>
    </div>
  `)

  loadAccount()
})
