// Blog data - in a real application, this would come from a backend
const blogPosts = [
  {
    id: 1,
    title: 'Getting Started with Web Development',
    excerpt: 'Learn the basics of HTML, CSS and JavaScript to build beautiful websites from scratch.',
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    date: 'April 15, 2025',
    author: 'John Developer',
    url: 'posts/post1.html'
  },
  {
    id: 2,
    title: 'Design Principles Every Developer Should Know',
    excerpt: 'Explore essential design concepts that will elevate your web projects to the next level.',
    image: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    date: 'April 18, 2025',
    author: 'Sarah Designer',
    url: 'posts/post2.html'
  },
  {
    id: 3,
    title: 'The Future of Web Technologies',
    excerpt: 'Discover upcoming trends and technologies that will shape the future of web development.',
    image: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    date: 'April 23, 2025',
    author: 'Alex Futurist',
    url: 'posts/post3.html'
  },
  {
    id: 4,
    title: 'Responsive Design Best Practices',
    excerpt: 'Learn how to create websites that look great on any device with these responsive design techniques.',
    image: 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    date: 'April 27, 2025',
    author: 'Emma Responsive',
    url: '#'
  },
  {
    id: 5,
    title: 'Introduction to CSS Grid Layout',
    excerpt: 'Master the powerful CSS Grid layout system to create complex web layouts with ease.',
    image: 'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    date: 'May 2, 2025',
    author: 'Mark Gridmaster',
    url: '#'
  },
  {
    id: 6,
    title: 'Web Performance Optimization',
    excerpt: 'Techniques and best practices to make your websites load faster and perform better.',
    image: 'https://images.pexels.com/photos/39284/macbook-apple-imac-computer-39284.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    date: 'May 7, 2025',
    author: 'Sophia Speedster',
    url: '#'
  }
];

// DOM Elements
const postsContainer = document.getElementById('posts-container');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

// Load blog posts
document.addEventListener('DOMContentLoaded', () => {
  if (postsContainer) {
    displayPosts(blogPosts);
    
    // Setup search functionality
    if (searchButton && searchInput) {
      searchButton.addEventListener('click', () => {
        searchPosts();
      });
      
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          searchPosts();
        }
      });
    }
  }
});

// Display posts in the container
function displayPosts(posts) {
  if (!postsContainer) return;
  
  postsContainer.innerHTML = '';
  
  if (posts.length === 0) {
    postsContainer.innerHTML = `
      <div class="no-results">
        <h3>No posts found</h3>
        <p>Try different search terms or browse all our posts.</p>
      </div>
    `;
    return;
  }
  
  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.innerHTML = `
      <div class="post-image" style="background-image: url('${post.image}')"></div>
      <div class="post-content">
        <h3>${post.title}</h3>
        <div class="post-meta">
          <span class="post-date">${post.date}</span>
          <span class="post-author">By: ${post.author}</span>
        </div>
        <p>${post.excerpt}</p>
        <a href="${post.url}" class="read-more">Read More</a>
      </div>
    `;
    postsContainer.appendChild(postElement);
  });
}

// Search posts based on input
function searchPosts() {
  const searchTerm = searchInput.value.toLowerCase();
  
  if (!searchTerm.trim()) {
    displayPosts(blogPosts);
    return;
  }
  
  const filteredPosts = blogPosts.filter(post => {
    return (
      post.title.toLowerCase().includes(searchTerm) ||
      post.excerpt.toLowerCase().includes(searchTerm) ||
      post.author.toLowerCase().includes(searchTerm)
    );
  });
  
  displayPosts(filteredPosts);
}

// Create new blog post (simple function to demonstrate how new posts could be added)
function createNewBlogPost(postData) {
  // In a real application, this would send data to a server
  // For now, we just add to our local array
  const newPost = {
    id: blogPosts.length + 1,
    ...postData,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  };
  
  blogPosts.unshift(newPost);
  
  // If we're on the blog page, refresh the display
  if (postsContainer) {
    displayPosts(blogPosts);
  }
  
  return newPost;
}