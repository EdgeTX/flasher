<template>
  <v-container>

      <v-container>
        <div>

          <v-select
            :items="fwbranches"
            v-model="currbr"
            item-text="name"
            item-value="name"
            label="Firmware Branch"
            class="rounded"
            solo
            @change="updateVersions"
          >
            <template slot="selection" slot-scope="data">
              {{ data.item.name }}
            </template>
            <template slot="item" slot-scope="data">
              {{ data.item.name }}
            </template>
          </v-select>

          <v-select
            :items="fwversions"
            v-model="currfw"
            item-text="created_at"
            item-value="id"
            label="Firmware Version"
            class="rounded"
            solo
            @change="updateContent"
          >
            <template slot="selection" slot-scope="data">
              {{ data.item.created_at }}
            </template>
            <template slot="item" slot-scope="data">
              {{ data.item.created_at }}
            </template>
          </v-select>

          <v-sheet elevation="3" class="rounded-lg">
            <v-tabs 
              class="rounded"
              next-icon="mdi-arrow-right-bold-box-outline"
              prev-icon="mdi-arrow-left-bold-box-outline"
              show-arrows
            >
              <v-tabs-slider color="blue"></v-tabs-slider>
              <v-tab
                v-for="tr in targets"
                :key="tr"
                :href="'#tab-' + tr"
                @change="updateSw(tr)"
              >
                {{ tr[0] }}
              </v-tab>
            </v-tabs>
          </v-sheet>

          <br>

          <v-textarea
            elevation="3"
            name="changelogbox"
            label="Select a firmware version to get notes"
            :value="changelog"
            solo
            readonly
          ></v-textarea>

          <v-btn
              color=""
              block
              elevation="2"
              large
              @click="flashFw"
              :disabled="noPopulatedInfo"
          >Write</v-btn>

          <v-btn
              class="mt-4"
              color="primary"
              block
              elevation="2"
              large
              @click="saveFw"
              :disabled="noPopulatedInfo"
          >Save to File</v-btn>
        </div>
      </v-container>

      <v-dialog
        v-model="dialog"
        hide-overlay
        persistent
        width="300"
      >
        <v-card
          color="primary"
          dark
        >
          <v-card-text class="pt-2">
            {{ message }}
            <v-progress-linear
              indeterminate
              color="white"
              class="mb-0"
            ></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-dialog
        v-model="dialogm"
        persistent
        max-width="400"
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
            >
              Close
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
  </v-container>
</template>

<script>
var commandExistsSync = require('command-exists').sync;
const fwbranch = require("../support/fw-branch.js");
const fs = require('fs')
const path = require('path')
const {remote} = require("electron")

export default {
  name: 'FlasherPage',
  
  data () {
      return {
        targets: [],
        fwbranches: [],
        fwversions: [],
        changelog: "",

        model: [],
        currfw: [],
        currbr: [],
        currtr: "",
        dialog: false,
        dialogm: false,
        message: "Loading firmware...",
        headingmsg: "Error",
        noPopulatedInfo: true
      }
  },

  methods: {
    comparator(a, b) {
      console.log(a, b);
      return a.id == b.id;
    },

    async updateContent() {
      var self = this;

      self.dialog = true;
      self.message = "Downloading metadata...";
      self.noPopulatedInfo = true;

      var indexdat = await fwbranch.downloadMetadata(self.currfw, fwbranch.defaultRepo);
      console.log(indexdat);

      if (indexdat != "") {
        self.targets = indexdat.targets;
        self.changelog = indexdat.changelog;
        self.currtr = indexdat.targets[0][1];
        self.noPopulatedInfo = false;

        console.log("Changelog updated");
      } else {
        self.currtr = "";
        self.changelog = "Firmware does not contain any metadata, please try another revision."
        self.noPopulatedInfo = true;
        self.targets = [];
      }

      self.dialog = false;
    },

    updateSw(swvalue) {
      this.currtr = swvalue[1];
    },

    dfuUtil(dfuargs) {
        var self = this;
        var platformstatus = ""; 
        const dfuPath = path.dirname(remote.app.getAppPath());

        if (process.platform == "win32" && fs.statSync(path.join(dfuPath, "../src/support/dfu-util/win64/")).isDirectory()) {
            console.log("Prepared for Windows");
            platformstatus = path.join(dfuPath, "../src/support/dfu-util/win64/", "dfu-util.exe").replace(/(\s+)/g, '\\$1');

        } else if (process.platform == "darwin" && fs.statSync(path.join(dfuPath, "../src/support/dfu-util/darwin/")).isDirectory()) { // working method
            console.log("Prepared for MacOS");
            platformstatus = path.join(dfuPath, "../src/support/dfu-util/darwin/", "dfu-util").replace(/(\s+)/g, '\\$1');

        } else if (process.platform == "linux" && commandExistsSync("dfu-util")) { // working method
            console.log("Prepared for Linux");
            platformstatus = "dfu-util";

        } else {
            self.headingmsg = "Error"
            self.dialog = false;
            self.message = "This platform is not supported or dfu-util cannot be found, if you are on linux please install it manually.";
            self.dialogm = true;
        }

        if (platformstatus != "") {
            var dfucmd = require('child_process').execFile(platformstatus, dfuargs); 

            dfucmd.stdout.on('data', (data) => {
              self.headingmsg = "Flashing..."
              self.dialog = false;
              self.message = self.message+(data).replace(/(?:\r\n|\r|\n)/g, '<br>');
              self.dialogm = true;

              let element = document.getElementById("containerbox");
              element.scrollIntoView({behavior: "smooth", block: "end"});
            });

            dfucmd.stderr.on('data', (data) => {
              self.headingmsg = "Flashing..."
              self.dialog = false;
              self.message = self.message+(data).replace(/(?:\r\n|\r|\n)/g, '<br>');
              self.dialogm = true;

              let element = document.getElementById("containerbox");
              element.scrollIntoView({behavior: "smooth", block: "end"});
            });

            dfucmd.on('close', () => {
              self.headingmsg = "Flashing Complete"
              self.dialog = false;
              self.dialogm = true;

              let element = document.getElementById("containerbox");
              element.scrollIntoView({behavior: "smooth", block: "end"});
            });
        }
    },

    async flashFw() {

      var self = this;
      self.dialog = true;
      self.message = "Downloading bin...";
       
      // eslint-disable-next-line no-unused-vars
      var fwbin = await fwbranch.downloadArtifact(self.currtr, self.currfw, fwbranch.defaultRepo);
      self.dialog = false;

      var tmpPath = path.join(remote.app.getPath('userData'), "flash.bin");

      fs.unlink(tmpPath, (err) => {
        if (err) {
          self.headingmsg = "File Error"
          self.dialog = false;
          self.message = err;
          self.dialogm = true;

          return
        }

        console.log("Cache Cleaned")
      })

      fs.writeFile(tmpPath, fwbin, function(err) {
          if(err) {
            self.headingmsg = "File Error"
            self.dialog = false;
            self.message = err;
            self.dialogm = true;
              
            return;
          }
          console.log("Starting DFU")

          self.dialog = true;
          self.message = "Waiting for dfu-util...";
          self.dfuUtil(["-a", "0", "--dfuse-address", "0x08000000", "--device", "0483:df11", "-D", tmpPath]);
      }); 
    },

    async saveFw() {
      var self = this;

      self.dialog = true;
      self.message = "Downloading bin...";

      var fwbin = await fwbranch.downloadArtifact(self.currtr, self.currfw, fwbranch.defaultRepo);

      self.message = "Creating binary package...";
      const element = document.createElement("a");
      const file = new Blob([Uint8Array.from(fwbin).buffer], {type: "text/plain"});
      element.href = URL.createObjectURL(file);
      element.download = self.currtr + "edgetx-"+self.currfw+".bin";
      element.click();

      self.dialog = false;
    },

    async updateBranches() {
      var self = this;
      var fws = await fwbranch.indexArtifacts(fwbranch.defaultRepo);

      fws.forEach(function (item) {
        var found = false;
        self.fwbranches.forEach(function (names) {
          console.log(names)
          if(names.name.startsWith(item.name)) {
            found = true;
          }
        });

        if (!found) {
          self.fwbranches.push(item);
        }
      });
    },

    async updateVersions() {
      var self = this;
      var fws = await fwbranch.indexArtifacts(fwbranch.defaultRepo);
      self.fwversions = [];
      self.noPopulatedInfo = true;

      fws.forEach(function (item) {
        console.log([item.name, self.currbr])
        if (item.name == self.currbr) {
          self.fwversions.push(item);
        }
      });
    },
  },

  created() {
    this.updateBranches()
  }
}
</script>
