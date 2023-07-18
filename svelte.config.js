import adapter from '@sveltejs/adapter-static';


export default {
    kit: {
        adapter: adapter({
            // default options are shown. On some platforms
            // these options are set automatically — see below
            pages: 'build',
            assets: 'build',
            paths: {
                base: '/FCWD_WebMap/index.html'
            },
            fallback: 'index.html',
            precompress: false,
            strict: true
        })
    }
};
