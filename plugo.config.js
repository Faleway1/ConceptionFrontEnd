const config = {
    darkMode: false,
    theme: {
        colors: {
            primary: '#6e52f7',
            success: '#78ffcb',
            warning: '#ffdb63',
            danger: '#ff5e78'
        },
        typography: {
            main: 'Arial, sans-serif',
            headlines: 'Verdana, sans-serif'
        },
        layout: {
            container: '1200px',
            cols: 12,
            breakpoints: {
                sm: '500px',
                md: '768px',
                lg: '1024px',
                xl: '1280px'
            }
        },
        spacing: {
            baseUnit: '16px',
            ratioLineHeight: '1.25'
        },
        transition: {
            duration: '300ms',
            type: 'ease'
        }
    },
    components: ['button', 'card', 'alert'],
    utilities: ['flex', 'spacing', 'color', 'image']
};

export default config;
