// DOM Elements
const header = document.getElementById('header');
const footer = document.getElementById('footer');

// Load header and footer
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load header
    const headerResponse = await fetch('/components/header.html');
    const headerHtml = await headerResponse.text();
    if (header) header.innerHTML = headerHtml;

    // Load footer
    const footerResponse = await fetch('/components/footer.html');
    const footerHtml = await footerResponse.text();
    if (footer) footer.innerHTML = footerHtml;

    // After loading header and footer, initialize features
    initMobileMenu();
    setActiveNavLink();
  } catch (error) {
    console.error('Error loading header or footer:', error);
  }
});

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

    // Normalize slashes for comparison
    const normalize = str => str.replace(/\/+$/, '');

    if (normalize(currentPath) === normalize(linkPath)) {
      link.classList.add('active');
    }
  });
}
