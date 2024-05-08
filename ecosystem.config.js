module.exports = {
    apps: [{
        name: "Reich Prices Bot",
        script: "dist/index.js",
        watch: true,
        ignore_watch: ["[\/\\]\./", "node_modules", 'db']
    }]
}