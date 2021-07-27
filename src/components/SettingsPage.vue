<template>
      <v-container>

        <v-sheet class="pt-1 pl-1 rounded">
          <p class="h6 font-weight-bold pt-1 pl-2">Flasher Settings</p>
          <v-sheet class="pl-5">
            <v-switch
              v-model="advancedFlash"
              inset
              label="Advanced Mode (List all available versions)"
              @change="updateProps()"
            ></v-switch>
          </v-sheet>
        </v-sheet>

        <br>

        <v-sheet class="pt-1 pl-1 rounded">
          <p class="h6 font-weight-bold pt-1 pl-2">Backup Settings</p>
          <v-sheet class="pl-5 pr-6 pb-6">
            <v-text-field
              v-model="defaultDir"
              label="Default Backup Directory..."
              hide-details="auto"
              @change="updateProps()"
            ></v-text-field>
          </v-sheet>
        </v-sheet>

        <br>

        <v-sheet class="pt-1 pl-1 rounded">
          <p class="h6 font-weight-bold pt-1 pl-2">App Options</p>
          <v-sheet class="pl-5">
            <v-switch
              v-model="themeSwitch"
              inset
              label="Dark Mode"
              @change="updateTheme()"
            ></v-switch>
          </v-sheet>
        </v-sheet>

      </v-container>
</template>

<script>

export default {
  name: 'SettingsPage',

  data () {
      return {
        advancedFlash: this.$store.getters.getOptions.advancedFlash,
        themeSwitch: this.$store.getters.getOptions.themeSwitch,
        defaultDir: this.$store.getters.getOptions.defaultDir
      }
  },

  methods: {
    updateTheme() {
      this.$vuetify.theme.dark = this.themeSwitch;
      //this.$vuetify.theme.dark = !this.$vuetify.theme.dark;
      this.updateProps()
    },

    updateProps() {
      this.$store.commit('update', {
        advancedFlash: this.advancedFlash,
        themeSwitch: this.themeSwitch,
        defaultDir: this.defaultDir
      })
    }
  }
}

</script>