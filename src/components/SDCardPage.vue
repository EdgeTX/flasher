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

                <v-virtual-scroll
                  :items="voices"
                  height="300"
                  item-height="64"
                >
                  <template v-slot:default="{ item }">
                    <v-list-item :key="item.filename" two-line>
                      <v-list-item-action>
                        <v-checkbox 
                          multiple
                          :key="item.filename"
                          :value="item"
                          :hide-details="true"
                          v-model="voiceSelect"
                        />
                      </v-list-item-action>

                      <v-list-item-content>
                        <v-list-item-title>
                          {{ item.name }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ item.description }}
                        </v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>

                    <v-divider></v-divider>
                  </template>
                </v-virtual-scroll>
                <br>

              </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-header>Lua Scripts and Tools</v-expansion-panel-header>
              <v-expansion-panel-content>
                <p>Please select any Lua Scripts or Tools that you need on your SD card.</p>

                <v-virtual-scroll
                  :items="scripts"
                  height="300"
                  item-height="64"
                >
                  <template v-slot:default="{ item }">
                    <v-list-item :key="item.filename" two-line>
                      <v-list-item-action>
                        <v-checkbox 
                          multiple
                          :key="item.filename"
                          :value="item"
                          :hide-details="true"
                          v-model="scriptSelect"
                        />
                      </v-list-item-action>

                      <v-list-item-content>
                        <v-list-item-title>
                          {{ item.name }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ item.description }}
                        </v-list-item-subtitle>
                      </v-list-item-content>       

                      <v-list-item-action>
                        <a
                          :href="item.infourl"
                          target="_blank"
                          style="text-decoration: none"
                        >
                          <v-icon small>
                            mdi-information
                          </v-icon>
                        </a>
                      </v-list-item-action>
                    </v-list-item>

                    <v-divider></v-divider>
                  </template>
                </v-virtual-scroll>
                <br>

              </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-header>Select Disk</v-expansion-panel-header>
              <v-expansion-panel-content>
                  <p>
                    Please select the drive letter for your SD Card. 
                    <br><br>
                    By ticking the "Erase Disk before Flashing" option, you can clean your SD card (except for model and radio settings), which is recommended. <span style="font-weight:bold; color: red">Be extra careful with this option and double check that you select the correct drive!</span>
                  </p>

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

        <br>
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
const tmplog = require("../support/tmplog.js");
const fs = require('fs');

export default {
  name: 'SDCardPage',
  
  data () {
      return {
        panel: [0, 1, 2, 3],
        readonly: false,

        dialogm: false,
        warndialog: false,
        message: "Loading...",
        headingmsg: "Error",
        winready: false,

        targets: [
          {name: "FrSky Horus X10", target: "c480x272.zip"},
          {name: "FrSky Horus X12s", target: "c480x272.zip"},
          {name: "FrSky QX7", target: "bw128x64.zip"},
          {name: "FrSky X9D", target: "bw212x64.zip"},
          {name: "FrSky X9D Plus", target: "bw212x64.zip"},
          {name: "FrSky X9D Plus 2019", target: "bw212x64.zip"},
          {name: "FrSky X-Lite", target: "bw128x64.zip"},
          {name: "FrSky X9 Lite", target: "bw128x64.zip"},
          {name: "Flysky Nirvana", target: "c320x480.zip"},
          {name: "Jumper T8", target: "bw128x64.zip"},
          {name: "Jumper T12", target: "bw128x64.zip"},
          {name: "Jumper T16", target: "c480x272.zip"},
          {name: "Jumper T18", target: "c480x272.zip"},
          {name: "Jumper T-Lite", target: "bw128x64.zip"},
          {name: "Jumper T-Pro", target: "bw128x64.zip"},
          {name: "RadioMaster TX12", target: "bw128x64.zip"},
          {name: "RadioMaster TX16S", target: "c480x272.zip"},
          {name: "RadioMaster Zorro", target: "bw128x64.zip"},
        ],

        voices: [],
        voiceSelect: [],
        radioSelect: {},

        scripts: [],
        scriptSelect: [],

        disks: ["None"],
        erasemode: false,
        diskSelect: {mount: ""}
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
                if ((filename != "RADIO") && (filename != "MODELS") && (filename != "EEPROM")) {
                  self.removeDir(path.join(pathx, filename))
                  fs.rmdirSync(path.join(pathx, filename), { recursive: true });
                }
              } catch (error) {
                tmplog.addLog({
                  type: "removeDir.message.error",
                  msg: error
                });
              }
            } else {
              try {
                fs.unlinkSync(path.join(pathx, filename))
              } catch (error) {
                tmplog.addLog({
                  type: "removeDir.message.error",
                  msg: error
                })
              }
            }
          })
        } else {
          tmplog.addLog({
            type: "removeDir.message",
            msg: "No files found in the directory."
          })
        }
      } else {
        self.message += "Directory path not found."

        tmplog.addLog({
          type: "removeDir.message",
          msg: "Directory path not found"
        })
      }
    },

    async updateConfig() {
      try {
        var self = this;

        self.voices = (await axios.get("https://github.com/EdgeTX/edgetx-sdcard-sounds/releases/download/latest/sounds.json", {responseType: 'json'})).data;
        this.voiceSelect = self.voices.filter(el => (el.default)).map(item => item['filename']);

        self.scripts = (await axios.get("https://github.com/EdgeTX/lua-scripts/releases/download/latest/scripts.json", {responseType: 'json'})).data;
        this.scriptSelect = self.scripts.filter(el => (el.default));
 
        si.blockDevices().then(function(data){
          tmplog.addLog({
            type: "updateConfig.message",
            msg: "Scanned all block devices"
          })
          tmplog.addLog({
            type: "updateConfig.data",
            msg: JSON.stringify(data)
          })

          self.disks = data.filter(function (el) {
            return el.removable && (el.mount != "")
          });
        }).catch(function (err) {
          tmplog.addLog({
            type: "updateConfig.message.error",
            msg: err
          })
        });
      } catch (e) {
        tmplog.addLog({
          type: "updateConfig.message.error",
          msg: e
        })
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
      var self = this;
      if (!self.targets.includes(self.radioSelect)) {
        self.headingmsg = "Error"
        self.message = "Please select a remote target before writing.";
        self.dialogm = true;
        self.winready = false;
        return;
      }

      if (fs.existsSync(self.diskSelect.mount)) {
        tmplog.addLog({
          type: "writeSD.message",
          msg: "Found mounted disk at "+self.diskSelect.mount
        })
      } else {
        tmplog.addLog({
          type: "writeSD.message",
          msg: "Please select a valid disk, none found. (msg shown)"
        })

        self.headingmsg = "Error"
        self.message = "Please select a valid disk, and ensure your transmitter is not in DFU mode.";
        self.dialogm = true;
        self.winready = false;
        return;
      }

      if (this.erasemode) {
        this.warndialog = true;
      } else {
        this.displayResults();
      }
    },

    async displayResults() {
      var self = this;
      self.openDisplayDialog(self);

      var sddir = self.diskSelect.mount;
      
      if (self.erasemode) {
        self.message += "Erasing card....<br>";
        self.removeDir(sddir);
      }

      var sdreleases = await fwbranch.listReleases(fwbranch.sdCardRepo);
      self.message += "Filtering releases...<br>";

      var asseturl = sdreleases.filter(obj => {
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
      zip.extractAllTo(sddir, /*overwrite*/ true);

      self.scrollDialog();
      
      if (this.voiceSelect.length > 0) {
        self.message += "Fetching sound pack index...<br>";
        var voicereleases = await fwbranch.listReleases(fwbranch.voiceRepo);

        /* Voicepack installation */

        self.message += "Filtering sound pack releases...<br>";
        
        var voiceurls = voicereleases.filter(obj => {
          return obj.tag_name == "latest"
        })[0].assets.filter(obj => {
          return self.voiceSelect.some(v => obj.name.includes(v.directory.toLowerCase()))
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
          vzip.extractAllTo(sddir, /*overwrite*/ false);

          self.message += `Installed voicepack ${vurl.name}<br>`;

          finishedvp += 1;
          if (finishedvp == (array.length)) self.scriptInstall(sddir);
        });

      } else {
        self.finishPage();
      }
    },

    scriptInstall (sddir) {
      var self = this;
      self.message += "<br>Downloading and decompressing all Lua scripts...<br><br>";

      var finishedsp = 0;
      self.scriptSelect.forEach(async function(surl, index, array){
        self.scrollDialog();
        self.message += `Downloading Lua script ${surl.name}...<br>`;

        try {
          const scriptbody = await axios.get(surl.filename, {
            responseType: 'arraybuffer',
          });

          if (surl.unpack_from.length > 0 && surl.unpack_from == "/") {
            var vzip = new AdmZip(Buffer.from(scriptbody.data));
            vzip.extractAllTo(path.join(sddir, surl.unpack_to), /*overwrite*/ false);
          } else if (surl.unpack_from.length > 0) {
            var vzip2 = new AdmZip(Buffer.from(scriptbody.data));
            vzip2.extractEntryTo(surl.unpack_from, path.join(sddir, surl.unpack_to), true, false, "");
          } else {
            fs.writeFileSync(path.join(sddir, surl.unpack_to), Buffer.from(scriptbody.data));
          }

          self.message += `Installed Lua script ${surl.name}<br>`;
        } catch (error) {
          self.message += `Error installing Lua script ${surl.name}!! Skipping...<br>`;
          console.error(error);
        }

        finishedsp += 1;
        if (finishedsp == (array.length)) self.finishPage();
      });
    },

    finishPage () {
      var self = this;

      tmplog.addLog({
        type: "displayResults.message",
        msg: "Finished adding all packages, disk may be removed!"
      })

      self.winready = false;
      self.message += `<br><b>Finished adding all packages, You may remove the disk now!</b><br>`;
      self.scrollDialog();
    }
  },

  created() {
    this.updateConfig()
  }
}
</script>
