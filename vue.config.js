module.exports = {
  transpileDependencies: [
    'vuetify'
  ],

  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,

      builderOptions: {
        // options placed here will be merged with default configuration and passed to electron-builder
        files: [
          "**/*"
        ],
        extraFiles: [
          {
              "from": "src/support/dfu-util",
              "to": "src/support/dfu-util",
              "filter": ["**/*"]
          }
        ]
      }

    }
  }
}
