<template>
<v-container>
    <v-container>
        <div>
          <h2>SD Card Preparation Tool</h2>
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
                    return-object
                    item-text="name"
                    solo
                  >
                    <template slot="selection" slot-scope="data">
                      {{ data.item.name }}
                    </template>
                    <template slot="item" slot-scope="data">
                      {{ data.item.name }}
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
                  <p>Please select the SD Card you want to write, please note if the checkbox below is enabled this will overwrite all contents of the disk so make sure to select the correct one.</p>

                  <v-select
                    :items="disks"
                    v-model="diskSelect"
                    label="Removable Disk"
                    class="rounded"
                    item-text="name"
                    return-object
                    solo
                  >
                    <template slot="selection" slot-scope="data">
                      {{ data.item.name }} ({{ data.item.label }})
                    </template>
                    <template slot="item" slot-scope="data">
                      {{ data.item.name }} ({{ data.item.label }})
                    </template>
                  </v-select>

                    <v-checkbox
                      v-model="erasemode"
                      label="Erase Disk before Flashing"
                    ></v-checkbox>

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
            @click="writeSD()"
          >Write to SD Card</v-btn>
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

    <v-row justify="center">
    <v-dialog
      v-model="warndialog"
      max-width="600"
    >
      <v-card>
        <v-card-title class="text-h5">
          Are you sure?
        </v-card-title>

        <v-card-text>
          <span class="red--text">THIS WILL ERASE ALL CONTENTS OF THE SD CARD EXCEPT FOR MODELS AND RADIO SETTINGS.</span><br><br>

          <b>Are you sure you want to continue?</b>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            color="primary"
            text
            @click="warndialog = false; displayResults();"
          >
            Continue
          </v-btn>

          <v-btn
            color="white darken-1"
            text
            @click="warndialog = false"
          >
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>

  </v-container>
</template>

<script>
const si = require('systeminformation');
const fwbranch = require("../support/fw-branch.js");
const axios = require('axios');
const AdmZip = require('adm-zip');
var path = require('path');
const fs = require('fs');

export default {
  name: 'SDCardPage',
  
  data () {
      return {
        panel: [0, 1, 2],
        readonly: false,

        dialogm: false,
        warndialog: false,
        message: "Loading...",
        headingmsg: "Error",
        winready: false,

        targets: [
          {name: "FlySky Nirvana", target: "nv14.zip"},
          {name: "Jumper T16", target: "horus.zip"},
          {name: "Jumper T18", target: "horus.zip"},
          {name: "Jumper T-Lite", target: "taranis-x7.zip"},
          {name: "Jumper T12", target: "taranis-x7.zip"},
          {name: "Jumper T8", target: "taranis-x7.zip"},
          {name: "FrSky Horus X10", target: "horus.zip"},
          {name: "FrSky Horus X12s", target: "horus.zip"},
          {name: "FrSky QX7", target: "taranis-x7.zip"},
          {name: "FrSky X9D", target: "taranis-x9.zip"},
          {name: "FrSky X9D Plus", target: "taranis-x9.zip"},
          {name: "FrSky X9D Plus 2019", target: "taranis-x9.zip"},
          {name: "FrSky X-Lite", target: "taranis-x7.zip"},
          {name: "FrSky X9 Lite", target: "taranis-x7.zip"},
          {name: "Radiomaster TX12", target: "taranis-x7.zip"},
          {name: "Radiomaster TX16s", target: "horus.zip"},
        ],
        voices: ["CZ", "DE", "EN", "ES", "FR", "IT", "PT", "RU"],
        disks: ["None"],
        erasemode: true,
        diskSelect: {mount: ""},
        radioSelect: {},
        voiceSelect: ['EN']
      }
  },

  methods: {
    removeDir (pathx) {
      var self = this;
      if (fs.existsSync(pathx)) {
        const files = fs.readdirSync(pathx)

        if (files.length > 0) {
          files.forEach(function(filename) {
            if (fs.statSync(pathx + "/" + filename).isDirectory()) {
              try {
                if ((filename != "RADIO") && (filename != "MODELS")) {
                  self.removeDir(path.join(pathx, filename))
                  fs.rmdirSync(path.join(pathx, filename), { recursive: true });
                }
              } catch (error) {
                console.log(error);
              }
            } else {
              try {
                fs.unlinkSync(path.join(pathx, filename))
              } catch (error) {
                console.log(error);
              }
            }
          })
        } else {
          console.log("No files found in the directory.")
        }
      } else {
        self.message += "Directory path not found."
      }
    },

    async updateConfig() {
      try {
        var self = this;

        si.blockDevices().then(function(data){
          console.log(data)
          self.disks = data.filter(function (el) {
            return el.removable && (el.label != "") && (el.mount != "")
          });
        }).catch(error => console.error(error));
      } catch (e) {
        console.error(e);
      }
    },

    async openDisplayDialog(self) {
      self.headingmsg = "Preparing SD Card"
      self.message = "Fetching index...<br>";
      self.dialogm = true;
      self.winready = true;
    },

    async scrollDialog() {
      let element = document.getElementById("containerbox");
      element.scrollIntoView({behavior: "smooth", block: "end"});
    },

    writeSD() {
      if (this.erasemode) {
        this.warndialog = true;
      } else {
        this.displayResults();
      }
    },

    async displayResults() {
      var self = this;
      self.openDisplayDialog(self);

      var sddir = "";
      if (fs.existsSync(self.diskSelect.mount)) {
        console.log("Found disk");
        console.log(self.diskSelect.mount);
        sddir = self.diskSelect.mount;
      } else {
        self.headingmsg = "Error"
        self.message = "Please select a valid disk!";
        self.dialogm = true;
        self.winready = false;

        return;
      }
      
      if (self.erasemode) {
        self.message += "Erasing card....<br>";
        self.removeDir(sddir);
      }

      var sdreleases = await fwbranch.listReleases(fwbranch.sdCardRepo);
      self.message += "Filtering releases...<br>";

      var asseturl = sdreleases.filter(obj => {
        console.log(obj);
        return obj.tag_name == "latest"
      })[0].assets.filter(obj => {
        return obj.name == self.radioSelect.target;
      })[0].browser_download_url;

      self.message += "Downloading structure package...<br>";
      const body = await axios.get(asseturl, {
          responseType: 'arraybuffer',
      });

      self.message += "Decompressing structure package...<br>";
      var zip = new AdmZip(Buffer.from(body.data));
      var zipEntries = zip.getEntries(); // an array of ZipEntry records

      self.message += "Moving to SD Card... (Please do not unplug now)<br>";
      zipEntries.forEach(function (zipEntry) {
          var xpath = path.join(sddir, zipEntry.entryName.substring(zipEntry.entryName.indexOf('/') + 1));
          if (!zipEntry.isDirectory) {
            xpath = xpath.substring(0, xpath.lastIndexOf("/"))
          }

          zip.extractEntryTo(zipEntry.entryName, xpath, false, /*overwrite*/ true);
      });

      self.scrollDialog();

      self.message += "Fetching sound pack index...<br>";
      var voicereleases = await fwbranch.listReleases(fwbranch.voiceRepo);

      self.message += "Filtering sound pack releases...<br>";
      var voiceurls = voicereleases.filter(obj => {
        return obj.tag_name == "latest"
      })[0].assets.filter(obj => {
        return self.voiceSelect.some(v => obj.name.includes(v.toLowerCase()))
      });

      self.message += "Downloading and decompressing all sound packs...<br><br>";

      var finishedvp = 0;
      voiceurls.forEach(async function(vurl, index, array){
        self.scrollDialog();
        self.message += `Downloading voicepack ${vurl.name}...<br>`;
        const voicebody = await axios.get(vurl.browser_download_url, {
            responseType: 'arraybuffer',
        });

        var vzip = new AdmZip(Buffer.from(voicebody.data));
        await vzip.extractAllTo(sddir, /*overwrite*/ false);

        self.message += `Installed voicepack ${vurl.name}<br>`;

        finishedvp += 1;

        if (finishedvp == (array.length)) {
          console.log("Finished loading");
          self.winready = false;
          self.message += `<br><b>Finished adding all packages, You may remove the disk now!</b><br>`;
          self.scrollDialog();
        }
      });
    },
  },

  created() {
    this.updateConfig()
  }
}
</script>