<template>
      <v-container>
        <v-row justify="space-around">
          <v-img
            lazy-src="../assets/edgetx.png"
            max-width="96%"
            src="../assets/edgetx.png"
            class="rounded-lg ma-3 ml-2 mr-2"
          ><h3 class="text-scope" >Welcome to EdgeTX Flasher!</h3></v-img>

          <br><br>

          <div class="mt-10 mr-3 ml-3">
          The new alternative to OpenTX Companion for updating radio firmware and optimizing backups. To change the theme or other options, go to the settings tab.
          </div>
        </v-row>
      </v-container>
</template>

<style scoped>
.text-scope {
  position: absolute;
  bottom: 10px;
  left: 15px;
}
</style>

<script>
export default {
  name: 'WelcomePage',

  data () {
      return {
      }
  },

  methods: {
    electronLink(addr) {
      require("electron").shell.openExternal(addr);
    }
  }
}
</script>