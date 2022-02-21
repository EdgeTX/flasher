<template>
      <v-container>

        <v-sheet class="pt-1 pl-1 rounded">
          <p class="h6 font-weight-bold pt-1 pl-2">Flasher Settings</p>
          <v-sheet class="pl-5">
            <v-switch
              v-model="advancedFlash"
              inset
              label="Advanced Mode (Development & unstable versions available)"
              @change="updateRSProps()"
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
            <v-select
              :items="themes"
              v-model="selTheme"
              label="Color Theme"
              class="rounded"
              item-text="name"
              return-object
              solo
              @change="updateTheme()"
            >
              <template slot="selection" slot-scope="data">
                {{ data.item.name }}
              </template>
              <template slot="item" slot-scope="data">
                {{ data.item.name }}
              </template>
            </v-select>

            <v-switch
              v-model="themeSwitch"
              inset
              
              label="Dark Mode"
              @change="updateTheme()"
            ></v-switch>
          </v-sheet>
        </v-sheet>

        <br>

        <v-sheet class="pt-1 pl-1 rounded">
          <p class="h6 font-weight-bold pt-1 pl-2">Logging</p>
          <v-sheet class="pl-5 pr-5 pb-5">
            <v-textarea
              v-model="logText"
              readonly
              style="font-weight: bold;"
              no-resize
            ></v-textarea>

            <v-btn
              class="mt-4"
              color="primary"
              block
              elevation="2"
              large
              @click="clearLog"
            >Clear Log</v-btn>
            <v-btn
              class="mt-4"
              color="primary"
              block
              elevation="2"
              large
              @click="copyClipboard"
            >Copy to clipboard</v-btn>
          </v-sheet>
        </v-sheet>

        <v-dialog
          v-model="dialog"
          hide-overlay
          persistent
          width="142"
        >
          <v-card
            color="primary"
            dark
          >
            <v-card-text class="pt-2">
              Relaunching...
              <br>
              <br>
              <v-progress-circular
                :rotate="-90"
                :size="92"
                :width="10"
                :value="value"
                color="white"
              >
                {{ value / 20 }}
              </v-progress-circular>
            </v-card-text>
          </v-card>
        </v-dialog>

        <br>
      </v-container>
</template>

<script>
const tmplog = require("../support/tmplog.js");
const {clipboard} = require('electron');
const {app} = require('electron').remote;

export default {
  name: 'SettingsPage',

  data () {
      return {
        advancedFlash: this.$store.getters.getOptions.advancedFlash,
        themeSwitch: this.$store.getters.getOptions.themeSwitch,
        defaultDir: this.$store.getters.getOptions.defaultDir,
        selTheme: this.$store.getters.getOptions.selTheme,
        logText: tmplog.getFormattedLog(),

        themes: [
          {
              name: "Defaults",
              colors: {
                  primary: '#1976D2',
                  secondary: '#424242',
                  accent: '#82B1FF',
                  error: '#FF5252',
                  info: '#2196F3',
                  success: '#4CAF50',
                  warning: '#FFC107',
              }
          },
          {
              name: "Swamp Green",
              colors: {
                  primary: '#138a36',
                  secondary: '#34403a',
                  accent: '#18ff6d',
              }
          },
          {
              name: "Hibiscus",
              colors: {
                  primary: '#622B5F',
                  secondary: '#3A3E3B',
                  accent: '#9E829C',
              }
          },
          {
              name: "Olive",
              colors: {
                  primary: '#98B06F',
                  secondary: '#726E60',
                  accent: '#DBFF76',
              }
          },
          {
              name: "Burgandy",
              colors: {
                  primary: '#721121',
                  secondary: '#A5402D',
                  accent: '#F15156',
              }
          },
          {
              name: "Gravel",
              colors: {
                  primary: '#9CAEA9',
                  secondary: '#6F6866',
                  accent: '#CCDAD1',
              }
          }
        ],

        dialog: false,
        value: 100,
        interval: {}
      }
  },

  methods: {
    updateTheme() {
      this.$vuetify.theme.dark = this.themeSwitch;
      this.$vuetify.theme.themes.light = this.selTheme.colors;
      this.$vuetify.theme.themes.dark = this.selTheme.colors;

      this.updateProps()
    },

    copyClipboard() {
      clipboard.writeText(this.logText, 'selection')
    },

    updateRSProps() {
      this.updateProps();

      this.dialog = true;
      this.interval = setInterval(() => {
        if (this.value == 0) {
          app.relaunch();
          app.exit();
        }
        this.value -= 20
      }, 1000)
    },

    updateProps() {
      this.$store.commit('update', {
        advancedFlash: this.advancedFlash,
        themeSwitch: this.themeSwitch,
        defaultDir: this.defaultDir,
        selTheme: this.selTheme
      })
    },

    clearLog() {
      tmplog.setLog([]);
      this.logText = tmplog.getFormattedLog();
    }
  }
}

</script>