<template>
<v-container>
    <v-container>
        <div>
          <h2>SD Card Preperation Tool</h2>
          <br>
          <v-expansion-panels
            v-model="panel"
            multiple
          >
            <v-expansion-panel>
              <v-expansion-panel-header>Radio Target</v-expansion-panel-header>
              <v-expansion-panel-content>
                  <p>Please select the SD Card target that matches your radio type, for more info check the <a target="_blank" href="https://github.com/EdgeTX/edgetx-sdcard/blob/master/README.md">SD Card readme.</a></p>

                  <v-select
                    :items="targets"
                    v-model="radioSelect"
                    label="Radio Target"
                    class="rounded"
                    solo
                  >
                    <template slot="selection" slot-scope="data">
                      {{ data.item }}
                    </template>
                    <template slot="item" slot-scope="data">
                      {{ data.item }}
                    </template>
                  </v-select>

              </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-header>Voicepack Languages</v-expansion-panel-header>
              <v-expansion-panel-content>
                <p>Please select your preferred Voicepack languages, for more info check the <a target="_blank" href="https://github.com/EdgeTX/edgetx-sdcard-sounds/blob/main/README.md">Voices readme.</a></p>

                <v-checkbox 
                  v-for="n in voices" 
                  multiple 
                  :key="n"
                  :value="n" 
                  :label="n" 
                  :hide-details="true"
                  v-model="voiceSelect"
                />

                <br>

              </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-header>Select Disk</v-expansion-panel-header>
              <v-expansion-panel-content>
                  <p>Please select the SD Card you want to write, please note this will overwrite all contents of the disk so make sure to select the correct one.</p>

                  <v-select
                    :items="disks"
                    v-model="diskSelect"
                    label="Removable Disk"
                    class="rounded"
                    item-text="name"
                    solo
                  >
                    <template slot="selection" slot-scope="data">
                      {{ data.item.name }} ({{ data.item.label }})
                    </template>
                    <template slot="item" slot-scope="data">
                      {{ data.item.name }} ({{ data.item.label }})
                    </template>
                  </v-select>

                  <v-btn
                    block
                    elevation="2"
                    large
                    @click="updateConfig()"
                  >Re-Scan Disks</v-btn>

              </v-expansion-panel-content>
            </v-expansion-panel>

          </v-expansion-panels>
        </div>

        <v-sheet class="mt-6">
          <v-btn
            color="primary"
            block
            elevation="2"
            large
            @click="displayResults"
          >Download Package</v-btn>
        </v-sheet>
    </v-container>

    <v-dialog
      v-model="dialogm"
      persistent
      max-width="600"
      scrollable
    >
      <v-card>
        <v-card-title class="headline">
          {{ headingmsg }}
        </v-card-title>
        <v-card-text><v-container id="containerbox"><p v-html="message"></p></v-container></v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            text
            @click="dialogm = false"
            :disabled="winready"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
const si = require('systeminformation');

export default {
  name: 'SDCardPage',
  
  data () {
      return {
        panel: [0, 1, 2],
        readonly: false,

        dialogm: false,
        message: "Loading...",
        headingmsg: "Error",
        winready: false,

        targets: ["NV14", "Horus", "Taranis-X7", "Taranis-X9"],
        voices: ["CZ", "DE", "EN", "ES", "FR", "IT", "PT", "RU"],
        disks: ["None"],
        diskSelect: {},
        radioSelect: "Horus",
        voiceSelect: ['EN']
      }
  },

  methods: {
    async updateConfig() {
      try {
        var self = this;

        si.blockDevices().then(function(data){
          self.disks = data.filter(function (el) {
            return el.removable && (el.label != "")
          });
        }).catch(error => console.error(error));
      } catch (e) {
        console.error(e);
      }
    },

    async displayResults() {
      console.log(this.radioSelect);
      console.log(this.voiceSelect);
    },
  },

  created() {
    this.updateConfig()
  }
}
</script>
