# Modern Blog Website

A clean, responsive blog website built with vanilla HTML, CSS, and JavaScript.

## Features

- Responsive design that works on all devices
- Home page with featured posts
- Blog listing page with search functionality
- Individual blog post pages
- Shared header and footer components
- Clean folder structure

## Directory Structure

```
/
├── index.html (Home page)
├── assets/
│   ├── css/
│   │   └── styles.css (Main CSS)
│   ├── js/
│   │   ├── main.js (Main JavaScript)
│   │   └── blog.js (Blog functionality)
├── blog/
│   ├── index.html (Blog listing page)
│   ├── posts/
│   │   ├── post1.html
│   │   ├── post2.html
│   │   ├── post3.html
│   │   └── template.html (Template for new posts)
└── components/
    ├── header.html
    └── footer.html
```

## Getting Started

1. Clone or download the repository
2. Open `index.html` in your browser to view the home page
3. Click on the "Blog" link in the navigation to view the blog listing

## Creating a New Blog Post

1. Copy the `blog/posts/template.html` file and rename it (e.g., `my-new-post.html`)
2. Update the content with your post title, date, author, and content
3. Add your new post to the `blogPosts` array in `assets/js/blog.js`

## Customization

- Update the color scheme in the CSS variables at the top of `assets/css/styles.css`
- Modify the header and footer components in the `components` folder
- Add additional pages as needed