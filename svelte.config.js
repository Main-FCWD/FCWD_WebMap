import adapter from '@sveltejs/adapter-static';


export default {
    kit: {
        adapter: adapter({
            // default options are shown. On some platforms
            // these options are set automatically — see below
            pages: 'build',
            assets: 'build',
            paths: {
                base: process.env.NODE_ENV === '/FCWD_WebMap'
            },
            fallback: './index.html',
            precompress: false,
            strict: true
        })
    }
};
