// DOM Elements
const header = document.getElementById('header');
const footer = document.getElementById('footer');

// Load header and footer
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Determine path prefix based on current URL
    const pathPrefix = getPathPrefix();
    
    // Load header
    const headerResponse = await fetch(`${pathPrefix}components/header.html`);
    const headerHtml = await headerResponse.text();
    if (header) header.innerHTML = headerHtml;
    
    // Load footer
    const footerResponse = await fetch(`${pathPrefix}components/footer.html`);
    const footerHtml = await footerResponse.text();
    if (footer) footer.innerHTML = footerHtml;
    
    // After loading header and footer, initialize mobile menu
    initMobileMenu();
    
    // Set active navigation link
    setActiveNavLink();
    
    // Fix navigation links
    fixNavigationLinks(pathPrefix);
    
  } catch (error) {
    console.error('Error loading header or footer:', error);
  }
});

// Get the correct path prefix for loading components
function getPathPrefix() {
  const path = window.location.pathname;
  
  if (path.includes('/blog/posts/')) {
    return '../../';
  } else if (path.includes('/blog/')) {
    return '../';
  } else {
    return './';
  }
}

// Initialize mobile menu functionality
function initMobileMenu() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navList = document.querySelector('.nav-list');
  
  if (mobileMenuToggle && navList) {
    mobileMenuToggle.addEventListener('click', () => {
      mobileMenuToggle.classList.toggle('active');
      navList.classList.toggle('active');
    });
  }
}

// Set active navigation link based on current page
function setActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    
    const linkPath = link.getAttribute('href');
    const linkDataNav = link.getAttribute('data-nav');
    
    if (linkDataNav === 'home' && (currentPath === '/' || currentPath.endsWith('/index.html'))) {
      link.classList.add('active');
    } else if (linkDataNav === 'blog' && currentPath.includes('/blog/')) {
      link.classList.add('active');
    }
  });
}

// Fix navigation links based on current path
function fixNavigationLinks(pathPrefix) {
  const navLinks = document.querySelectorAll('a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // Only process internal links that start with / (but skip absolute URLs with protocol)
    if (href && href.startsWith('/') && !href.startsWith('//')) {
      // Remove leading slash and prepend path prefix
      const newHref = pathPrefix + href.substring(1);
      link.setAttribute('href', newHref);
    }
  });
}