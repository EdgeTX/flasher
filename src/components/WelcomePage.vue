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

      <div class="mt-7 mr-6 ml-6">
      The new alternative to OpenTX Companion for updating radio firmware and setting up your SD Card. To change the theme or other options, go to the settings tab.

      <br><br>
      For more info and help, visit our Github Wiki:

      <v-btn
          class="mt-4"
          color="secondary"
          block
          elevation="2"
          large
          @click="electronLink('https://github.com/EdgeTX/edgetx.github.io/wiki/EdgeTX-Installation-Guide')"
      >Open Wiki Page</v-btn>

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