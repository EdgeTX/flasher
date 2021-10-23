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
            class="rounded mb-0 mt-0 pt-0 pb-0"
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
            return-object
            label="Firmware Version"
            class="rounded mb-0 mt-0 pt-0 pb-0"
            solo
            @change="updateContent"
          >
            <template slot="selection" slot-scope="data">
              {{ data.item.commitId }} ({{ data.item.created_at }})
            </template>
            <template slot="item" slot-scope="data">
              {{ data.item.commitId }} ({{ data.item.created_at }})
            </template>
          </v-select>

          <!--<v-sheet elevation="3" class="rounded-lg">
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
          </v-sheet>-->

          <v-select
            :items="targets"
            v-model="currtr"
            item-value="[1]"
            label="Radio Target"
            class="rounded mb-0 mt-0 pt-0 pb-0"
            solo
          >
            <template v-slot:item="{item}">
              {{item[0]}}
            </template>    
            <template v-slot:selection="{item}">
              {{item[0]}}
            </template>
          </v-select>

          <v-textarea
            elevation="3"
            name="changelogbox"
            label="Select a firmware version to get notes"
            :value="changelog"
            solo
            readonly
          ></v-textarea>

        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-header>DFU & Debugging Options</v-expansion-panel-header>
            <v-expansion-panel-content>
              <b>Please only use these options if you are having issues flashing or it was suggested from a similar issue.</b>
              <br>
              <v-checkbox
                v-model="debugmode"
                label="Force Unprotect before flashing"
                value=":unprotect:force"
              ></v-checkbox>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>

        <div style="height:20px"></div>

          <div ref="app">
            <v-btn
                color=""
                block
                elevation="2"
                large
                @click="flashFw"
                :disabled="noPopulatedInfo"
            >Flash Radio Firmware</v-btn>

                <v-btn
                    class="mt-4 mr-2"
                    color="primary"
                    elevation="2"
                    large
                    @click="saveFw"
                    :disabled="noPopulatedInfo"
                    :width="49+'%'"
                >Save to File</v-btn>

                <v-btn
                    class="mt-4"
                    color="primary"
                    elevation="2"
                    large
                    @click="flashLocalFw"
                    :width="49+'%'"
                >Flash Local File</v-btn>
          </div>

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
var commandExistsSync = require('command-exists').sync;
const fwbranch = require("../support/fw-branch.js");
const tmplog = require("../support/tmplog.js");
const fs = require('fs')
const path = require('path')
const {remote} = require("electron");

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
        debugmode: [],
        noPopulatedInfo: true,

        dialog: false,
        dialogm: false,
        message: "Loading firmware...",
        headingmsg: "Error",
        winready: false
      }
  },

  methods: {
    comparator(a, b) {
      return a.id == b.id;
    },

    async updateContent() {
      var self = this;

      self.dialog = true;
      self.message = "Downloading metadata...";
      self.noPopulatedInfo = true;

      var indexdat = (self.currbr == "releases") ? (await fwbranch.downloadReleaseMetadata(self.currfw.bdurl)) : (await fwbranch.downloadMetadata(self.currfw.id, fwbranch.defaultRepo))

      self.dialog = false;

      tmplog.addLog({
        type: "updateContent.data.indexdat",
        msg: JSON.stringify(indexdat)
      })

      if (indexdat != "") {
        self.targets = indexdat.targets;
        self.changelog = self.currfw.commitMsg;
        self.currtr = indexdat.targets[0][1];
        self.noPopulatedInfo = false;

        tmplog.addLog('addLog', {
          type: "updateContent.message",
          msg: "Metadata found, changelog has been updated."
        })
      } else {
        self.currtr = "";
        self.changelog = "Firmware does not contain any metadata, please try another revision."
        self.noPopulatedInfo = true;
        self.targets = [];

        tmplog.addLog({
          type: "updateContent.message",
          msg: "Metadata not found, error showing."
        });
      }
    },

    /*updateSw(swvalue) {
      this.currtr = swvalue[1];
    },*/

    dfuUtil(dfuargs) {
        var ignoreMsgs = [
          "dfu-util: Warning: Invalid DFU suffix signature",
          "dfu-util: A valid DFU suffix will be required in a future dfu-util release!!!",
          "Warning: Invalid DFU suffix signature",
          "Invalid DFU suffix signature",
          "A valid DFU suffix will be required in a future dfu-util release!!!",
        ];

        var self = this;
        var platformstatus = ""; 
        const dfuPath = path.dirname(remote.app.getAppPath());

        if (process.platform == "win32" && fs.statSync(path.join(dfuPath, "../src/support/dfu-util/win64/")).isDirectory()) {
            tmplog.addLog({
              type: "dfuUtil.message",
              msg: "Found DFU Util for Windows, path set."
            })
            platformstatus = path.join(dfuPath, "../src/support/dfu-util/win64/", "dfu-util.exe");
        } else if (process.platform == "darwin" && fs.statSync(path.join(dfuPath, "../src/support/dfu-util/darwin/")).isDirectory()) { // working method
            tmplog.addLog({
              type: "dfuUtil.message",
              msg: "Found DFU Util for MacOS, path set."
            })
            platformstatus = path.join(dfuPath, "../src/support/dfu-util/darwin/", "dfu-util");
        } else if (process.platform == "linux" && commandExistsSync("dfu-util")) { // working method
            tmplog.addLog({
              type: "dfuUtil.message",
              msg: "Found DFU Util for Linux package, system binary path set."
            })
            platformstatus = "dfu-util";
        } else if (process.platform == "linux" && fs.statSync(path.join(dfuPath, "../src/support/dfu-util/linux-amd64/")).isDirectory()) { // working method
            tmplog.addLog({
              type: "dfuUtil.message",
              msg: "Found DFU Util for Linux-amd64, path set."
            })
            platformstatus = path.join(dfuPath, "../src/support/dfu-util/linux-amd64/", "dfu-util");
        } else {
            tmplog.addLog({
              type: "dfuUtil.message",
              msg: "No DFU binary found, could be a missing package. System: "+process.platform
            })

            self.headingmsg = "Error"
            self.dialog = false;
            self.message = "This platform is not supported or dfu-util cannot be found, if you are on linux please install it manually.<br><br><a href=\"http://dfu-util.sourceforge.net/\">Check here for more instructions: http://dfu-util.sourceforge.net/</a>";
            self.dialogm = true;
        }

        if (platformstatus != "") {
            self.winready = true;

            var dfucmd = require('child_process').execFile(platformstatus, dfuargs); 

            dfucmd.stdout.on('data', (data) => {
              var ign = ignoreMsgs.filter(function (item) {
                return data.toLowerCase().includes(item.toLowerCase());
              });
              if (ign.length > 0) data="\n";

              self.headingmsg = "Flashing..."
              self.dialog = false;
              self.message = self.message+(data).replace(/(?:\r\n|\r|\n)/g, '<br>');
              self.dialogm = true;
              self.winready = true;

              let element = document.getElementById("containerbox");
              element.scrollIntoView({behavior: "smooth", block: "end"});
            });

            dfucmd.stderr.on('data', (data) => {
              var ign = ignoreMsgs.filter(function (item) {
                return data.toLowerCase().includes(item.toLowerCase());
              });
              if (ign.length > 0) data="\n";

              self.headingmsg = "Flashing..."
              self.dialog = false;
              self.message = self.message+(data).replace(/(?:\r\n|\r|\n)/g, '<br>');
              self.dialogm = true;
              self.winready = true;

              let element = document.getElementById("containerbox");
              element.scrollIntoView({behavior: "smooth", block: "end"});
            });

            dfucmd.on('close', () => {
              self.winready = false;
              self.headingmsg = "Flashing Complete"
              self.dialog = false;
              self.dialogm = true;

              let element = document.getElementById("containerbox");
              element.scrollIntoView({behavior: "smooth", block: "end"});
            });
        }
    },

    async flashFw() {
      console.log("mtrs");
      console.log(this.currtr);

      var self = this;
      self.dialog = true;
      self.message = "Downloading bin...";
       
      // eslint-disable-next-line no-unused-vars
      var fwbin = (self.currbr == "releases") ? (await fwbranch.downloadFwRelease(self.currtr, self.currfw.bdurl)) : (await fwbranch.downloadArtifact(self.currtr, self.currfw.id, fwbranch.defaultRepo));
      self.dialog = false;

      var tmpPath = path.join(remote.app.getPath('userData'), "flash.bin");

      fs.unlink(tmpPath, (err) => {
        if (err) {
          self.headingmsg = "File Error"
          self.dialog = false;
          self.message = err;
          self.dialogm = true;

          tmplog.addLog({
            type: "flashFw.message",
            msg: "Error in deleting firmware file"
          })

          return;
        }
        tmplog.addLog({
          type: "flashFw.message",
          msg: "Firmware file cache deleted"
        })
      })

      fs.writeFile(tmpPath, fwbin, function(err) {
          if(err) {
            self.headingmsg = "File Error"
            self.dialog = false;
            self.message = err;
            self.dialogm = true;

            tmplog.addLog({
              type: "flashFw.message",
              msg: "Error in writing new firmware file"
            })
              
            return;
          }
          tmplog.addLog({
            type: "flashFw.message",
            msg: "Start DFU Util binary..."
          })

          var dfuOptions = ["-a", "0", "--dfuse-address", `0x08000000${self.debugmode.join("")}`, "--device", "0483:df11", "-D", tmpPath];

          tmplog.addLog({
            type: "flashFw.message",
            msg: dfuOptions.join(" ")
          })

          self.dialog = true;
          self.message = `Waiting for dfu-util...<br><br>`;
          
          self.dfuUtil(dfuOptions);
      });
    },

    async saveFw() {
      var self = this;

      self.dialog = true;
      self.message = "Downloading bin...";

      var fwbin = (self.currbr == "releases") ? (await fwbranch.downloadFwRelease(self.currtr, self.currfw.bdurl)) : (await fwbranch.downloadArtifact(self.currtr, self.currfw.id, fwbranch.defaultRepo));

      self.message = "Creating binary package...";
      const element = document.createElement("a");
      const file = new Blob([Uint8Array.from(fwbin).buffer], {type: "text/plain"});
      element.href = URL.createObjectURL(file);
      element.download = self.currtr + "edgetx-"+self.currfw.id+".bin";
      element.click();

      self.dialog = false;
    },

    async flashLocalFw() {
      var self = this;
      self.dialog = true;
      self.message = "Moving bin...";

      var fwbin = fs.readFileSync(remote.dialog.showOpenDialogSync({
        properties: ['openFile'],
        filters: [
          { name: 'Binary Files', extensions: ['bin'] },
        ],
        buttonLabel: "Flash to Radio"
      })[0]);

      self.dialog = false;

      var tmpPath = path.join(remote.app.getPath('userData'), "flash.bin");

      fs.unlink(tmpPath, (err) => {
        if (err) {
          self.headingmsg = "File Error"
          self.dialog = false;
          self.message = err;
          self.dialogm = true;

          tmplog.addLog({
            type: "flashFw.message",
            msg: "Error in deleting firmware file"
          })

          return;
        }
        tmplog.addLog({
          type: "flashFw.message",
          msg: "Firmware file cache deleted"
        })
      })

      fs.writeFile(tmpPath, fwbin, function(err) {
          if(err) {
            self.headingmsg = "File Error"
            self.dialog = false;
            self.message = err;
            self.dialogm = true;

            tmplog.addLog({
              type: "flashFw.message",
              msg: "Error in writing new firmware file"
            })
              
            return;
          }
          tmplog.addLog({
            type: "flashFw.message",
            msg: "Start DFU Util binary..."
          })

          self.dialog = true;
          self.message = "Waiting for dfu-util...";
          self.dfuUtil(["-a", "0", "--dfuse-address", "0x08000000", "--device", "0483:df11", "-D", tmpPath]);
      });
    },

    async updateBranches() {
      var self = this;
      var fws = await fwbranch.indexArtifacts(fwbranch.defaultRepo);

      fws.forEach(await (async function (item) {
        var found = false;
        var fwbr = JSON.parse(JSON.stringify(await fwbranch.branchArtifact(fwbranch.defaultRepo, item.artifacts_url)));

        var fwbrcp = fwbr;

        self.fwbranches.forEach(function (names) {
          var fwbrcopy = fwbr;

          if ((fwbrcopy.artifacts.length > 0) && !(typeof names === 'undefined')) {
            tmplog.addLog({
              type: "updateBranches.message",
              msg: "Found valid branch data"
            })
            tmplog.addLog({
              type: "updateBranches.data",
              msg: JSON.stringify(fwbrcopy)
            })

            if(names.name.startsWith(fwbrcopy.artifacts[0].name)) {
              found = true;
            }
          }
        });

        if (!found) {
          if (typeof fwbrcp.artifacts[0] !== 'undefined') {
            self.fwbranches.push(fwbrcp.artifacts[0]);
          }

          tmplog.addLog({
            type: "updateBranches.message",
            msg: "Found multiple valid branches"
          })
          tmplog.addLog({
            type: "updateBranches.data",
            msg: JSON.stringify(self.fwbranches)
          })
        }
      }));
    },

    async updateTags (){
      this.fwbranches.push({name: "releases"});
    },

    async updateVersions() {
      var self = this;

      if (self.currbr == "releases"){
        // Sort by tags
        var tags = await fwbranch.indexTags(fwbranch.defaultRepo);
        self.fwversions = [];
        self.noPopulatedInfo = true;
        var ltimestamp = tags[0].created_at;

        tags.forEach(await (async function (item) {
          if (item.tag_name.match(new RegExp(".*RC\\d+","i"))) {
            return;
          }

          ltimestamp = (new Date(ltimestamp.created_at) < new Date(item.created_at)) ? item : ltimestamp;

          for (var i = 0; i < item.assets.length; i++) {
            if (item.assets[i].name.startsWith("edgetx-firmware")) {
              self.fwversions.push({
                commitId: item.tag_name,
                commitMsg: item.body,
                id: item.tag_name,
                created_at: item.created_at,
                bdurl: item.assets[i].browser_download_url
              });
            }
          }
        }));

        self.currfw = ltimestamp;
      } else {
        // Sort by branches
        var fws = await fwbranch.indexArtifacts(fwbranch.defaultRepo);
        self.fwversions = [];
        self.noPopulatedInfo = true;

        fws.forEach(await (async function (item) {
          var fwbr = JSON.parse(JSON.stringify(await fwbranch.branchArtifact(fwbranch.defaultRepo, item.artifacts_url)));
          if (fwbr.artifacts.length > 0) {
            if (fwbr.artifacts[0].name == self.currbr) {
              fwbr.artifacts[0].commitId = "#"+item.head_commit.id.slice(0, 7);
              fwbr.artifacts[0].commitMsg = item.head_commit.message;
              self.fwversions.push(fwbr.artifacts[0]);
            }
          }
        }));
      }
    },
  },

  created() {
    tmplog.addLog({
      type: "created.message",
      msg: "Instance created, loading info from GH API"
    })

    if (this.$store.getters.getOptions.advancedFlash) {
      this.updateBranches()
      this.updateTags()
    } else {
      this.updateTags()
    }
  }
}
</script>
