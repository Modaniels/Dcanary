// Documentation interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Global variables for search
    let selectedResultIndex = -1;
    
    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const closeSearch = document.getElementById('close-search');
    const searchResults = document.getElementById('search-results');
    
    if (searchBtn && searchModal) {
        searchBtn.addEventListener('click', function() {
            searchModal.classList.remove('hidden');
            searchInput.focus();
        });
        
        closeSearch.addEventListener('click', function() {
            searchModal.classList.add('hidden');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });
        
        // Close modal on escape or click outside
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !searchModal.classList.contains('hidden')) {
                searchModal.classList.add('hidden');
                searchInput.value = '';
                searchResults.innerHTML = '';
            }
        });
        
        // Close modal when clicking outside
        searchModal.addEventListener('click', function(e) {
            if (e.target === searchModal) {
                searchModal.classList.add('hidden');
                searchInput.value = '';
                searchResults.innerHTML = '';
            }
        });
        
        // Search functionality with keyboard navigation
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.toLowerCase().trim();
            selectedResultIndex = -1;
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }
            
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });
        
        // Keyboard navigation for search results
        searchInput.addEventListener('keydown', function(e) {
            const resultElements = searchResults.querySelectorAll('.search-result');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedResultIndex = Math.min(selectedResultIndex + 1, resultElements.length - 1);
                updateSelectedResult(resultElements);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
                updateSelectedResult(resultElements);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedResultIndex >= 0 && resultElements[selectedResultIndex]) {
                    resultElements[selectedResultIndex].click();
                }
            }
        });
    }
    
    // Navigation link highlighting
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    const sections = document.querySelectorAll('section[id]');
    
    function highlightNavigation() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('text-blue-600', 'bg-blue-50', 'font-medium');
            link.classList.add('text-gray-700');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.remove('text-gray-700');
                link.classList.add('text-blue-600', 'bg-blue-50', 'font-medium');
            }
        });
    }
    
    window.addEventListener('scroll', highlightNavigation);
    
    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').slice(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Tab functionality
    const tabs = document.querySelectorAll('[data-tab]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            const tabContainer = this.closest('.mb-8, .mb-6, .mb-4').querySelector('.mt-6, .mt-4');
            const allTabs = this.closest('nav').querySelectorAll('[data-tab]');
            const allContents = tabContainer ? tabContainer.querySelectorAll('[id]') : [];
            
            // Remove active styles from all tabs
            allTabs.forEach(t => {
                t.classList.remove('border-blue-500', 'text-blue-600', 'active');
                t.classList.add('border-transparent', 'text-slate-400');
            });
            
            // Hide all content panels
            allContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });
            
            // Add active styles to clicked tab
            this.classList.remove('border-transparent', 'text-slate-400');
            this.classList.add('border-blue-500', 'text-blue-600', 'active');
            
            // Show corresponding content
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('active');
            }
        });
    });
    
    // Copy to clipboard functionality
    window.copyToClipboard = function(text, button) {
        // Handle different call patterns
        if (typeof text === 'string' && text) {
            // Direct call with text string
            navigator.clipboard.writeText(text).then(() => {
                // Find the button that was clicked (if available)
                if (button && button.innerHTML) {
                    const originalIcon = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check text-green-400"></i>';
                    setTimeout(() => {
                        button.innerHTML = originalIcon;
                    }, 2000);
                }
            }).catch(() => {
                if (button && button.innerHTML) {
                    const originalIcon = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-times text-red-400"></i>';
                    setTimeout(() => {
                        button.innerHTML = originalIcon;
                    }, 2000);
                }
            });
        } else {
            // Initialize copy buttons for code blocks
            const copyButtons = document.querySelectorAll('.copy-btn');
            copyButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    const codeBlock = this.closest('pre').querySelector('code');
                    const text = codeBlock.textContent;
                    
                    navigator.clipboard.writeText(text).then(() => {
                        const originalIcon = this.innerHTML;
                        this.innerHTML = '<i class="fas fa-check text-green-400"></i>';
                        setTimeout(() => {
                            this.innerHTML = originalIcon;
                        }, 2000);
                    }).catch(() => {
                        const originalIcon = this.innerHTML;
                        this.innerHTML = '<i class="fas fa-times text-red-400"></i>';
                        setTimeout(() => {
                            this.innerHTML = originalIcon;
                        }, 2000);
                    });
                });
            });
        }
    };
    
    // Initialize copy buttons
    copyToClipboard();
    
    // Helper functions for search
    function performSearch(query) {
        const sections = document.querySelectorAll('.docs-section, section[id]');
        const results = [];
        
        sections.forEach(section => {
            const titleElement = section.querySelector('h1, h2, h3');
            const title = titleElement ? titleElement.textContent : 'Unknown Section';
            const content = section.textContent.toLowerCase();
            
            if (content.includes(query)) {
                const snippet = extractSnippet(content, query);
                results.push({
                    title: title,
                    section: section.id,
                    snippet: snippet
                });
            }
        });
        
        // Also search in navigation links
        const navLinks = document.querySelectorAll('nav a[href^="#"]');
        navLinks.forEach(link => {
            const linkText = link.textContent.toLowerCase();
            if (linkText.includes(query) && !results.find(r => r.section === link.getAttribute('href').slice(1))) {
                results.push({
                    title: link.textContent,
                    section: link.getAttribute('href').slice(1),
                    snippet: `Navigate to ${link.textContent} section`
                });
            }
        });
        
        displaySearchResults(results, query);
    }

    function extractSnippet(content, query) {
        const index = content.indexOf(query);
        const start = Math.max(0, index - 100);
        const end = Math.min(content.length, index + query.length + 100);
        
        let snippet = content.substring(start, end);
        
        // Add ellipsis if truncated
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';
        
        return snippet;
    }

    function displaySearchResults(results, query) {
        selectedResultIndex = -1;
        
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="text-slate-400 text-center py-8">No results found for "' + query + '"</p>';
            return;
        }
        
        const resultsHtml = results.map(result => `
            <a href="#${result.section}" class="block p-4 hover:bg-slate-700 border-b border-slate-700 search-result transition-colors duration-200">
                <h4 class="font-medium text-slate-100 mb-2">${result.title}</h4>
                <p class="text-sm text-slate-300 leading-relaxed">${highlightQuery(result.snippet, query)}</p>
            </a>
        `).join('');
        
        searchResults.innerHTML = resultsHtml;
        
        // Add click handlers to search results
        searchResults.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').slice(1);
                const targetSection = document.getElementById(targetId);
                
                // Close search modal
                searchModal.classList.add('hidden');
                searchInput.value = '';
                searchResults.innerHTML = '';
                
                // Smooth scroll to section
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Highlight the section briefly
                    targetSection.style.background = 'rgba(59, 130, 246, 0.1)';
                    setTimeout(() => {
                        targetSection.style.background = '';
                    }, 2000);
                }
            });
        });
    }

    function highlightQuery(text, query) {
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<span class="bg-blue-600 text-blue-100 px-1 rounded font-medium">$1</span>');
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function updateSelectedResult(resultElements) {
        // Remove previous selection
        resultElements.forEach(el => el.classList.remove('bg-slate-600'));
        
        // Add selection to current item
        if (selectedResultIndex >= 0 && resultElements[selectedResultIndex]) {
            resultElements[selectedResultIndex].classList.add('bg-slate-600');
            resultElements[selectedResultIndex].scrollIntoView({
                block: 'nearest'
            });
        }
    }
    
    // Reading progress indicator
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.transform = 'scaleX(0)';
    document.body.appendChild(progressBar);
    
    function updateProgressBar() {
        const scrollTop = document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
        
        progressBar.style.transform = `scaleX(${scrolled / 100})`;
    }
    
    window.addEventListener('scroll', updateProgressBar);
    
    // Floating table of contents for large screens
    const tocFloating = document.createElement('div');
    tocFloating.className = 'toc-floating hidden';
    tocFloating.innerHTML = `
        <h4 class="font-semibold text-gray-900 mb-3">On This Page</h4>
        <nav class="space-y-1">
            ${Array.from(sections).map(section => 
                `<a href="#${section.id}" class="block text-sm text-gray-600 hover:text-blue-600 py-1">${section.querySelector('h2').textContent}</a>`
            ).join('')}
        </nav>
    `;
    document.body.appendChild(tocFloating);
    
    // Show/hide floating TOC based on screen size and scroll position
    function toggleFloatingToc() {
        if (window.innerWidth >= 1280) {
            if (scrollY > 300) {
                tocFloating.classList.remove('hidden');
            } else {
                tocFloating.classList.add('hidden');
            }
        } else {
            tocFloating.classList.add('hidden');
        }
    }
    
    window.addEventListener('scroll', toggleFloatingToc);
    window.addEventListener('resize', toggleFloatingToc);
    
    // Add anchor links to headings
    const headings = document.querySelectorAll('h2[id], h3[id], h4[id]');
    headings.forEach(heading => {
        heading.style.position = 'relative';
        heading.addEventListener('mouseenter', function() {
            if (!this.querySelector('.anchor-link')) {
                const anchor = document.createElement('a');
                anchor.className = 'anchor-link absolute -left-6 text-gray-400 hover:text-blue-600 opacity-0 transition-opacity';
                anchor.href = '#' + this.id;
                anchor.innerHTML = '<i class="fas fa-link"></i>';
                anchor.style.top = '50%';
                anchor.style.transform = 'translateY(-50%)';
                this.appendChild(anchor);
                
                setTimeout(() => {
                    anchor.style.opacity = '1';
                }, 100);
            }
        });
        
        heading.addEventListener('mouseleave', function() {
            const anchor = this.querySelector('.anchor-link');
            if (anchor) {
                anchor.style.opacity = '0';
                setTimeout(() => {
                    anchor.remove();
                }, 200);
            }
        });
    });
    
    // Syntax highlighting for code blocks
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    
    // Add copy buttons to code blocks
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        const pre = block.parentElement;
        if (!pre.querySelector('.copy-btn')) {
            const button = document.createElement('button');
            button.className = 'copy-btn absolute top-2 right-2 text-gray-400 hover:text-white cursor-pointer';
            button.innerHTML = '<i class="fas fa-copy"></i>';
            button.title = 'Copy code';
            
            pre.style.position = 'relative';
            pre.appendChild(button);
            
            button.addEventListener('click', function() {
                const text = block.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    this.innerHTML = '<i class="fas fa-check text-green-400"></i>';
                    setTimeout(() => {
                        this.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 2000);
                }).catch(() => {
                    this.innerHTML = '<i class="fas fa-times text-red-400"></i>';
                    setTimeout(() => {
                        this.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 2000);
                });
            });
        }
    });
});

// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileSearchBtn = document.getElementById('mobile-search-btn');
const openSidebar = document.getElementById('open-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Mobile navigation menu toggle
if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
        mobileMenu.classList.toggle('hidden');
        
        // Toggle hamburger icon
        const icon = this.querySelector('i');
        if (mobileMenu.classList.contains('hidden')) {
            icon.className = 'fas fa-bars text-xl';
        } else {
            icon.className = 'fas fa-times text-xl';
        }
    });
}

// Mobile search button
if (mobileSearchBtn) {
    mobileSearchBtn.addEventListener('click', function() {
        const searchModal = document.getElementById('search-modal');
        const searchInput = document.getElementById('search-input');
        if (searchModal && searchInput) {
            searchModal.classList.remove('hidden');
            searchInput.focus();
            // Close mobile menu
            if (mobileMenu) {
                mobileMenu.classList.add('hidden');
                const menuIcon = mobileMenuBtn.querySelector('i');
                menuIcon.className = 'fas fa-bars text-xl';
            }
        }
    });
}

// Sidebar toggle for mobile
if (openSidebar && closeSidebar && sidebar && sidebarOverlay) {
    // Open sidebar
    openSidebar.addEventListener('click', function() {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
    
    // Close sidebar
    function closeSidebarMenu() {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    closeSidebar.addEventListener('click', closeSidebarMenu);
    sidebarOverlay.addEventListener('click', closeSidebarMenu);
    
    // Close sidebar when clicking on a link (mobile)
    const sidebarLinks = sidebar?.querySelectorAll('a[href^="#"]');
    if (sidebarLinks) {
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth < 1024) {
                    setTimeout(() => {
                        sidebar.classList.add('-translate-x-full');
                        sidebarOverlay.classList.add('hidden');
                        document.body.style.overflow = '';
                    }, 100); // Small delay for smooth UX
                }
            });
        });
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenu.classList.add('hidden');
            const menuIcon = mobileMenuBtn.querySelector('i');
            if (menuIcon) {
                menuIcon.className = 'fas fa-bars text-xl';
            }
        }
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (window.innerWidth >= 1024) {
        // Desktop view
        if (mobileMenu) {
            mobileMenu.classList.add('hidden');
            const menuIcon = mobileMenuBtn?.querySelector('i');
            if (menuIcon) {
                menuIcon.className = 'fas fa-bars text-xl';
            }
        }
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    } else {
        // Mobile view
        if (sidebar) {
            sidebar.classList.add('-translate-x-full');
        }
    }
});

// Analytics tracking for documentation
function trackDocumentationEvent(eventName, properties = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
            event_category: 'Documentation',
            ...properties
        });
    }
}

// Track section views
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            trackDocumentationEvent('section_view', {
                section: entry.target.id,
                section_title: entry.target.querySelector('h2')?.textContent
            });
        }
    });
}, {
    threshold: 0.5,
    rootMargin: '0px 0px -100px 0px'
});

document.querySelectorAll('.docs-section').forEach(section => {
    sectionObserver.observe(section);
});

// Track search queries
document.getElementById('search-input')?.addEventListener('input', function() {
    const query = this.value.trim();
    if (query.length > 2) {
        trackDocumentationEvent('search_query', {
            query: query
        });
    }
});

// Track copy actions
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('copy-btn') || e.target.closest('.copy-btn')) {
        trackDocumentationEvent('code_copy', {
            code_type: e.target.closest('pre')?.querySelector('code')?.className || 'unknown'
        });
    }
});

// Export functions for global access
window.Docs = {
    copyToClipboard: copyToClipboard,
    trackEvent: trackDocumentationEvent
};
