// JavaScript for Dcanary Documentation Website

// DOM Elements
let mobileMenuBtn;
let mobileMenu;
let navLinks;
let mobileNavLinks;
let cmdNavLinks;

// Enhanced mobile menu toggle with animation
document.addEventListener('DOMContentLoaded', function() {
    // Re-initialize DOM elements after DOM is loaded
    mobileMenuBtn = document.getElementById('mobile-menu-btn');
    mobileMenu = document.getElementById('mobile-menu');
    navLinks = document.querySelectorAll('.nav-link');
    mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    cmdNavLinks = document.querySelectorAll('.cmd-nav-link');
    
    if (mobileMenuBtn && mobileMenu) {
        const menuIcon = mobileMenuBtn.querySelector('i');
        
        // Mobile Menu Toggle
        mobileMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const isHidden = mobileMenu.classList.contains('hidden');
            
            if (isHidden) {
                // Show menu
                mobileMenu.classList.remove('hidden');
                setTimeout(() => mobileMenu.classList.add('show'), 10);
                if (menuIcon) {
                    menuIcon.classList.remove('fa-bars');
                    menuIcon.classList.add('fa-times');
                }
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            } else {
                // Hide menu
                mobileMenu.classList.remove('show');
                setTimeout(() => mobileMenu.classList.add('hidden'), 300);
                if (menuIcon) {
                    menuIcon.classList.remove('fa-times');
                    menuIcon.classList.add('fa-bars');
                }
                document.body.style.overflow = ''; // Restore scroll
            }
        });
        
        // Close mobile menu when clicking on a link
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('show');
                setTimeout(() => mobileMenu.classList.add('hidden'), 300);
                if (menuIcon) {
                    menuIcon.classList.remove('fa-times');
                    menuIcon.classList.add('fa-bars');
                }
                document.body.style.overflow = ''; // Restore scroll
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    mobileMenu.classList.remove('show');
                    setTimeout(() => mobileMenu.classList.add('hidden'), 300);
                    if (menuIcon) {
                        menuIcon.classList.remove('fa-times');
                        menuIcon.classList.add('fa-bars');
                    }
                    document.body.style.overflow = ''; // Restore scroll
                }
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 768) {
                // Desktop view - hide mobile menu if shown
                if (!mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.remove('show');
                    mobileMenu.classList.add('hidden');
                    if (menuIcon) {
                        menuIcon.classList.remove('fa-times');
                        menuIcon.classList.add('fa-bars');
                    }
                    document.body.style.overflow = ''; // Restore scroll
                }
            }
        });
    }
    
    // Navigation logo click animation
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
        navLogo.addEventListener('click', () => {
            // Scroll to top with extra style
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Add a fun rotation animation
            navLogo.style.transform = 'rotate(360deg) scale(1.1)';
            setTimeout(() => {
                navLogo.style.transform = '';
            }, 600);
        });
    }
});

// Navigation Active State Management
function setActiveNavLink(targetId) {
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        link.classList.add('text-slate-300');
    });
    
    mobileNavLinks.forEach(link => {
        link.classList.remove('text-blue-600', 'bg-blue-50');
        link.classList.add('text-slate-300');
    });
    
    // Add active class to current nav link
    const activeLink = document.querySelector(`a[href="#${targetId}"].nav-link`);
    if (activeLink) {
        activeLink.classList.add('text-blue-400', 'border-b-2', 'border-blue-400');
        activeLink.classList.remove('text-slate-300');
    }
    
    const activeMobileLink = document.querySelector(`a[href="#${targetId}"].mobile-nav-link`);
    if (activeMobileLink) {
        activeMobileLink.classList.add('text-blue-400', 'bg-blue-500/20');
        activeMobileLink.classList.remove('text-slate-300');
    }
    
    // Track navigation
    if (window.trackNavigation) {
        trackNavigation(targetId);
    }
}

// Command Navigation Active State
function setActiveCmdNavLink(targetId) {
    const cmdNavLinks = document.querySelectorAll('.cmd-nav-link');
    
    cmdNavLinks.forEach(link => {
        link.classList.remove('text-blue-600', 'bg-blue-50');
        link.classList.add('text-gray-600');
    });
    
    const activeLink = document.querySelector(`a[href="#${targetId}"].cmd-nav-link`);
    if (activeLink) {
        activeLink.classList.add('text-blue-600', 'bg-blue-50');
        activeLink.classList.remove('text-gray-600');
    }
}

// Smooth Scrolling for Navigation Links
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling after DOM is loaded
    setTimeout(() => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                
                // Skip if it's just a hash or external link
                if (href === '#' || href.includes('docs.html')) {
                    return; // Let the default behavior handle it
                }
                
                e.preventDefault();
                
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update active states
                    if (this.classList.contains('nav-link') || this.classList.contains('mobile-nav-link')) {
                        setActiveNavLink(targetId);
                    } else if (this.classList.contains('cmd-nav-link')) {
                        setActiveCmdNavLink(targetId);
                    }
                    
                    // Close mobile menu if open
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                        mobileMenu.classList.remove('show');
                        setTimeout(() => mobileMenu.classList.add('hidden'), 300);
                        const menuIcon = document.querySelector('#mobile-menu-btn i');
                        if (menuIcon) {
                            menuIcon.classList.remove('fa-times');
                            menuIcon.classList.add('fa-bars');
                        }
                        document.body.style.overflow = ''; // Restore scroll
                    }
                }
            });
        });
    }, 100);
});

// Intersection Observer for Active Navigation
const sections = document.querySelectorAll('section[id]');
const observerOptions = {
    rootMargin: '-20% 0px -80% 0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            setActiveNavLink(entry.target.id);
        }
    });
}, observerOptions);

sections.forEach(section => {
    observer.observe(section);
});

// Command Section Observer
const cmdSections = document.querySelectorAll('.cmd-section');
const cmdObserverOptions = {
    rootMargin: '-20% 0px -80% 0px',
    threshold: 0.1
};

const cmdObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            setActiveCmdNavLink(entry.target.id);
        }
    });
}, cmdObserverOptions);

cmdSections.forEach(section => {
    cmdObserver.observe(section);
});

// Copy to Clipboard Functionality
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show success feedback
        showCopyFeedback();
        // Track command copy
        if (window.trackCommandCopy) {
            trackCommandCopy(text);
        }
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopyFeedback();
        // Track command copy
        if (window.trackCommandCopy) {
            trackCommandCopy(text);
        }
    });
}

function showCopyFeedback() {
    // Create and show copy feedback
    const feedback = document.createElement('div');
    feedback.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
    feedback.innerHTML = '<i class="fas fa-check mr-2"></i>Copied to clipboard!';
    feedback.style.transform = 'translateY(-20px)';
    feedback.style.opacity = '0';
    
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => {
        feedback.style.transform = 'translateY(0)';
        feedback.style.opacity = '1';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        feedback.style.transform = 'translateY(-20px)';
        feedback.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 300);
    }, 3000);
}

// Add copy buttons to all code blocks
document.addEventListener('DOMContentLoaded', () => {
    const codeBlocks = document.querySelectorAll('.code-block');
    
    codeBlocks.forEach(block => {
        const code = block.querySelector('code');
        if (code && !block.querySelector('.copy-btn')) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn ml-2';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.onclick = () => copyToClipboard(code.textContent);
            block.appendChild(copyBtn);
        }
    });
});

// Scroll to Top Functionality
const scrollToTopBtn = document.createElement('button');
scrollToTopBtn.className = 'fixed bottom-8 right-8 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 z-50';
scrollToTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
scrollToTopBtn.style.display = 'none';
document.body.appendChild(scrollToTopBtn);

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Show/Hide Scroll to Top Button
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopBtn.style.display = 'block';
    } else {
        scrollToTopBtn.style.display = 'none';
    }
});

// Loading Animation for Dynamic Content
function showLoading(element) {
    element.innerHTML = '<div class="loading"></div>';
}

function hideLoading(element, content) {
    element.innerHTML = content;
}

// Search Functionality (for future implementation)
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 2) {
                performSearch(query);
            } else {
                searchResults.innerHTML = '';
                searchResults.style.display = 'none';
            }
        });
    }
}

function performSearch(query) {
    // This would integrate with a search API or perform client-side search
    console.log('Searching for:', query);
}

// Theme Toggle (for future dark mode implementation)
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
    
    if (currentTheme === 'light') {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
}

// Load saved theme preference
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    // ESC key closes mobile menu
    if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
    
    // Ctrl/Cmd + K for search (future implementation)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input when implemented
        console.log('Search shortcut triggered');
    }
});

// Form Validation (for future contact/feedback forms)
function validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('border-red-500');
            isValid = false;
        } else {
            field.classList.remove('border-red-500');
        }
    });
    
    return isValid;
}

// Analytics (for future implementation)
function trackEvent(action, category, label) {
    // This would integrate with Google Analytics or similar
    console.log('Event tracked:', { action, category, label });
}

// Page Load Performance
window.addEventListener('load', () => {
    // Track page load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    console.log('Page load time:', loadTime, 'ms');
    
    // Initialize lazy loading for images
    initLazyLoading();
});

// Lazy Loading for Images
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Service Worker Registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Error Handling
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
    // Could send errors to logging service
});

// Enhanced Interactive Features
function initInteractiveFeatures() {
    // Add typing effect to hero section
    const heroTitle = document.querySelector('.hero-section h1');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        heroTitle.textContent = '';
        typeText(heroTitle, originalText, 100);
    }
    
    // Add counter animations for statistics
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        animateCounter(counter, target);
    });
    
    // Add parallax effect to hero section
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroPattern = document.querySelector('.hero-pattern');
        if (heroPattern) {
            heroPattern.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
    
    // Add command demo functionality
    initCommandDemo();
}

// Typing Effect
function typeText(element, text, delay) {
    let index = 0;
    const interval = setInterval(() => {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(interval);
        }
    }, delay);
}

// Counter Animation
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.ceil(current);
        }
    }, 20);
}

// Command Demo
function initCommandDemo() {
    const demoTerminal = document.getElementById('demo-terminal');
    if (demoTerminal) {
        const commands = [
            'mody add-instructions --project-id "demo-project" --version "1.0.0" --file "./build.sh"',
            'mody scm register "demo-project" --provider github --owner "user" --repo "project"',
            'mody request-verification --project-id "demo-project" --version "1.0.0" --executors 3'
        ];
        
        let currentCommand = 0;
        const terminalContent = demoTerminal.querySelector('.terminal-content');
        
        setInterval(() => {
            if (currentCommand < commands.length) {
                const line = document.createElement('div');
                line.className = 'terminal-line';
                line.innerHTML = `<span class="terminal-prompt">$ </span><span class="terminal-command">${commands[currentCommand]}</span>`;
                terminalContent.appendChild(line);
                currentCommand++;
                
                // Scroll to bottom
                demoTerminal.scrollTop = demoTerminal.scrollHeight;
            } else {
                currentCommand = 0;
                terminalContent.innerHTML = '';
            }
        }, 3000);
    }
}

// Enhanced Search with Highlighting
function enhancedSearch(query) {
    const searchableElements = document.querySelectorAll('h1, h2, h3, h4, p, li, code');
    const results = [];
    
    searchableElements.forEach(element => {
        if (element.textContent.toLowerCase().includes(query.toLowerCase())) {
            results.push({
                element: element,
                text: element.textContent,
                section: element.closest('section')?.id || 'unknown'
            });
        }
    });
    
    displaySearchResults(results, query);
}

function displaySearchResults(results, query) {
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="p-4 text-gray-500">No results found</div>';
        return;
    }
    
    const resultsHTML = results.map(result => {
        const highlighted = result.text.replace(
            new RegExp(query, 'gi'),
            `<mark class="bg-yellow-200">$&</mark>`
        );
        return `
            <div class="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer" 
                 onclick="scrollToElement('${result.section}')">
                <div class="font-medium text-gray-900">${result.section}</div>
                <div class="text-sm text-gray-600">${highlighted}</div>
            </div>
        `;
    }).join('');
    
    searchResults.innerHTML = resultsHTML;
    searchResults.style.display = 'block';
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Performance Monitoring
function monitorPerformance() {
    // Monitor scroll performance
    let ticking = false;
    
    function updateScrollPosition() {
        const scrolled = window.pageYOffset;
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const scrollProgress = (scrolled / maxScroll) * 100;
        
        // Update scroll progress indicator
        const progressBar = document.querySelector('.scroll-progress');
        if (progressBar) {
            progressBar.style.width = `${scrollProgress}%`;
        }
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateScrollPosition);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

// Add scroll progress indicator
function addScrollProgressIndicator() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        z-index: 1000;
        transition: width 0.3s ease;
    `;
    document.body.appendChild(progressBar);
}

// Add easter egg
function addEasterEgg() {
    let sequence = [];
    const konamiCode = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'KeyB', 'KeyA'
    ];
    
    document.addEventListener('keydown', (e) => {
        sequence.push(e.code);
        if (sequence.length > konamiCode.length) {
            sequence.shift();
        }
        
        if (sequence.join(',') === konamiCode.join(',')) {
            showEasterEgg();
            sequence = [];
        }
    });
}

function showEasterEgg() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white p-8 rounded-2xl text-center max-w-md">
            <h3 class="text-2xl font-bold mb-4">🎉 Easter Egg Found!</h3>
            <p class="text-gray-600 mb-6">You found the secret Konami code! 
            Dcanary is built with love and attention to detail.</p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Awesome!
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Navigation scroll effects
let lastScrollY = window.scrollY;
const nav = document.querySelector('.nav-backdrop');

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    
    // Add subtle shadow on scroll
    if (currentScrollY > 20) {
        nav.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
        nav.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)';
    } else {
        nav.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
        nav.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)';
    }
    
    // Highlight active navigation section
    updateActiveNavLink();
    
    lastScrollY = currentScrollY;
});

// Update active navigation link based on scroll position
function updateActiveNavLink() {
    const sections = ['home', 'features', 'installation', 'examples', 'about'];
    const navLinks = document.querySelectorAll('.nav-link:not([href="docs.html"])');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link:not([href="docs.html"])');
    
    let currentSection = 'home';
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                currentSection = sectionId;
            }
        }
    });
    
    // Update desktop nav
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
    
    // Update mobile nav
    mobileNavLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

// Modern D logo interaction
document.addEventListener('DOMContentLoaded', function() {
    const dLogo = document.querySelector('.modern-d-logo');
    if (dLogo) {
        dLogo.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 150);
            }, 100);
        });
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    initSearch();
    
    // Add interactive animations
    const interactiveElements = document.querySelectorAll('.interactive-element');
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'scale(1.05)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'scale(1)';
        });
    });
    
    // Initialize tooltips
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', () => {
            const tooltipText = tooltip.querySelector('.tooltiptext');
            if (tooltipText) {
                tooltipText.style.visibility = 'visible';
                tooltipText.style.opacity = '1';
            }
        });
        
        tooltip.addEventListener('mouseleave', () => {
            const tooltipText = tooltip.querySelector('.tooltiptext');
            if (tooltipText) {
                tooltipText.style.visibility = 'hidden';
                tooltipText.style.opacity = '0';
            }
        });
    });
    
    // Add new features
    initInteractiveFeatures();
    monitorPerformance();
    addScrollProgressIndicator();
    addEasterEgg();
    
    // Add live demo terminal
    const demoSection = document.getElementById('demo-section');
    if (demoSection) {
        const terminal = document.createElement('div');
        terminal.id = 'demo-terminal';
        terminal.className = 'bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto';
        terminal.innerHTML = '<div class="terminal-content"></div>';
        demoSection.appendChild(terminal);
    }
    
    console.log('🚀 Dcanary Documentation Website fully loaded with enhanced features!');
});
