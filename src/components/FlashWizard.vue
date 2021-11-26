<template>
  <v-container>
      <div 
        v-show="(pageShow < 3)"
        style="margin-left: 30px; margin-right: 30px; margin-top: 10px;"
      >
        <step-progress 
          :steps="['Version', 'Target', 'Install']" 
          :current-step="pageShow"
          icon-class="fa fa-check"
          :active-color="(this.$store.getters.getOptions.themeSwitch ? '#329EF4' : '#329EF4')"
          line-thickness="8"
          active-thickness="3"
          passive-thickness="1"
        ></step-progress>
      </div>

      <v-container v-show="(pageShow == 0)">
        <br>
        <p>Choose the software version you want to flash. We recommend that you choose the latest version.</p>

        <br>
        <v-select
            :items="fwversions"
            v-model="currfw"
            item-text="created_at"
            return-object
            label="Firmware Version"
            class="rounded mb-0 mt-0 pt-0 pb-0"
            solo
          >
            <template slot="selection" slot-scope="data">
              {{ data.item.commitId }} ({{ data.item.created_at }})
            </template>
            <template slot="item" slot-scope="data">
              {{ data.item.commitId }} ({{ data.item.created_at }})
            </template>
        </v-select>

        <v-btn class="bottombtn" :disabled="fwversions.includes(currfw)==false" v-on:click="updateContent();pageShow+=1;" color="primary">Next</v-btn>
      </v-container>

      <v-container v-show="(pageShow == 1)">
        <br>
        <p>Choose which radio you are flashing from the dropdown below, and click flash firmware when you are ready. </p>

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

        <v-btn class="bottombtnrh" :disabled="([targets].map(x => x.map(a => a[1])).flat(2)).includes(currtr) == false" v-on:click="pageShow+=1;saveFw();" color="primary">Save to File</v-btn>
        <v-btn class="bottombtnlh" :disabled="([targets].map(x => x.map(a => a[1])).flat(2)).includes(currtr) == false" v-on:click="pageShow+=1;flashFw()" color="red" >Flash Firmware</v-btn>
      </v-container>

      <v-container v-show="(pageShow == 2)">
        <br>
        <h2 style="text-align:center">Thank you for using EdgeTX!</h2>
        <br>
        <p>If you encounter any issues please contact us from one of the links below.</p>
        <br>
        <div style="text-align:center">
          <a href="https://discord.gg/wF9wUKnZ6H" class="biglink">Discord</a>
          <a href="https://www.facebook.com/groups/edgetx" class="biglink">Facebook</a>
          <a href="https://github.com/EdgeTX/edgetx/discussions" class="biglink">Github Discussions</a>
        </div>

       <v-btn class="bottombtn" v-on:click="pageShow=0;" color="primary">Close</v-btn>
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

<style>
.bottombtn {
   position: absolute;
   bottom: 25px;
   left: 5%;
   width: 90%;
}

.bottombtnrh {
   position: absolute;
   bottom: 25px;
   right: 4%;
   width: 44%;
}

.bottombtnlh {
   position: absolute;
   bottom: 25px;
   left: 4%;
   width: 44%;
}

.biglink {
  text-align: center;
  font-size: 16px;
  padding: 15px;
}
</style>

<script>
var commandExistsSync = require('command-exists').sync;
const fwbranch = require("../support/fw-branch.js");
const tmplog = require("../support/tmplog.js");
const fs = require('fs')
const path = require('path')
const {remote} = require("electron");

export default {
  name: 'FlashWizard',
  
  data () {
      return {
        pageShow: 0,

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
          self.message = `Waiting for dfu-util...`;
          
          self.dfuUtil(dfuOptions);
      });
    },

    async updateTags (){
      this.fwbranches.push({name: "releases"});
    },

    async updateVersions() {
      var self = this;
      
      var tags = await fwbranch.indexTags(fwbranch.defaultRepo);
      self.fwversions = [];
      self.targets = [];
      self.changelog = "";
      self.noPopulatedInfo = true;

      var ltimestamp = 0;

      tags.forEach(await (async function (item) {
        if (item.tag_name.match(new RegExp(".*RC\\d+","i")) || item.tag_name == "nightly") {
          return;
        }

        ltimestamp = ltimestamp == 0 ? item : ltimestamp;
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
    },
  },

  created() {
    tmplog.addLog({
      type: "created.message",
      msg: "Instance created, loading info from GH API"
    })

    this.updateTags()

    this.currbr = "releases";
    this.updateVersions();
  }
}
</script>
