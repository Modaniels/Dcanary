// Analytics and Performance Monitoring
// This file handles tracking, performance monitoring, and user behavior analytics

class DcanaryAnalytics {
    constructor() {
        this.startTime = performance.now();
        this.interactions = [];
        this.performanceMetrics = {};
        this.init();
    }

    init() {
        this.trackPageLoad();
        this.trackUserInteractions();
        this.trackPerformance();
        this.trackScrollDepth();
        this.trackTimeOnPage();
    }

    // Track page load metrics
    trackPageLoad() {
        window.addEventListener('load', () => {
            const loadTime = performance.now() - this.startTime;
            this.performanceMetrics.pageLoadTime = loadTime;
            
            // Track Core Web Vitals
            this.trackCoreWebVitals();
            
            console.log(`📊 Page loaded in ${loadTime.toFixed(2)}ms`);
        });
    }

    // Track Core Web Vitals
    trackCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.performanceMetrics.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                this.performanceMetrics.fid = entry.processingStart - entry.startTime;
            });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            this.performanceMetrics.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
    }

    // Track user interactions
    trackUserInteractions() {
        // Track clicks
        document.addEventListener('click', (e) => {
            const target = e.target;
            const elementType = target.tagName.toLowerCase();
            const elementClass = target.className;
            const elementId = target.id;
            
            this.interactions.push({
                type: 'click',
                element: elementType,
                class: elementClass,
                id: elementId,
                timestamp: Date.now(),
                x: e.clientX,
                y: e.clientY
            });
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            this.interactions.push({
                type: 'form_submit',
                formId: form.id,
                timestamp: Date.now()
            });
        });

        // Track link clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                const href = e.target.href;
                const text = e.target.textContent;
                this.interactions.push({
                    type: 'link_click',
                    href: href,
                    text: text,
                    timestamp: Date.now()
                });
            }
        });
    }

    // Track scroll depth
    trackScrollDepth() {
        let maxScrollDepth = 0;
        const depths = [25, 50, 75, 100];
        const triggered = new Set();

        window.addEventListener('scroll', () => {
            const scrollDepth = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollDepth > maxScrollDepth) {
                maxScrollDepth = scrollDepth;
            }

            depths.forEach(depth => {
                if (scrollDepth >= depth && !triggered.has(depth)) {
                    triggered.add(depth);
                    this.interactions.push({
                        type: 'scroll_depth',
                        depth: depth,
                        timestamp: Date.now()
                    });
                }
            });
        });
    }

    // Track time on page
    trackTimeOnPage() {
        let startTime = Date.now();
        
        // Track when user leaves page
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Date.now() - startTime;
            this.performanceMetrics.timeOnPage = timeOnPage;
        });

        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.performanceMetrics.timeOnPage = Date.now() - startTime;
            } else {
                startTime = Date.now();
            }
        });
    }

    // Track feature usage
    trackFeatureUsage(featureName, action) {
        this.interactions.push({
            type: 'feature_usage',
            feature: featureName,
            action: action,
            timestamp: Date.now()
        });
    }

    // Track errors
    trackError(error, context) {
        this.interactions.push({
            type: 'error',
            error: error.message,
            stack: error.stack,
            context: context,
            timestamp: Date.now()
        });
    }

    // Get performance report
    getPerformanceReport() {
        return {
            metrics: this.performanceMetrics,
            interactions: this.interactions,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        };
    }

    // Send analytics data (placeholder for future implementation)
    sendAnalytics() {
        const report = this.getPerformanceReport();
        
        // This would send data to analytics service
        console.log('📈 Analytics Report:', report);
        
        // Example: Send to Google Analytics
        // gtag('event', 'page_view', { ...report });
        
        // Example: Send to custom analytics endpoint
        // fetch('/api/analytics', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(report)
        // });
    }
}

// Initialize analytics
const analytics = new DcanaryAnalytics();

// Track specific Dcanary features
function trackDcanaryFeature(feature, action) {
    analytics.trackFeatureUsage(feature, action);
}

// Track CLI command copies
function trackCommandCopy(command) {
    trackDcanaryFeature('cli_command', 'copy');
    analytics.interactions.push({
        type: 'command_copy',
        command: command,
        timestamp: Date.now()
    });
}

// Track navigation
function trackNavigation(section) {
    trackDcanaryFeature('navigation', section);
}

// Track documentation section views
function trackDocumentationView(section) {
    trackDcanaryFeature('documentation', section);
}

// Export analytics for global use
window.DcanaryAnalytics = analytics;
window.trackDcanaryFeature = trackDcanaryFeature;
window.trackCommandCopy = trackCommandCopy;
window.trackNavigation = trackNavigation;
window.trackDocumentationView = trackDocumentationView;
