<template>
  <v-container>

      <v-container>
        <div>
          <v-select
            :items="fwversions"
            v-model="currfw"
            item-text="name"
            item-value="id"
            label="Firmware Version"
            class="rounded"
            solo
            @change="updateContent"
          >
            <template slot="selection" slot-scope="data">
              {{ data.item.name }} {{ data.item.id }}
            </template>
            <template slot="item" slot-scope="data">
              {{ data.item.name }} {{ data.item.id }}
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

          <!--<v-list class="rounded" elevation="6">
            <v-list-item 
                v-for="item in fwflags"                           
                :key="item.id"
             >
              <v-row class="ml-1">
                <v-checkbox 
                  v-model="model"             
                  :label="item.name + '    -    ' + item.description"  
                  :value="item.name" 
                  :value-comparator="comparator"
                  class="shrink mr-2"
                ></v-checkbox>
              </v-row>
            </v-list-item>
          </v-list>-->

          <v-textarea
            elevation="3"
            name="changelogbox"
            label="Select a firmware version to get notes"
            :value="changelog"
            solo
            readonly
          ></v-textarea>

          <br>

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
        max-width="290"
      >
        <v-card>
          <v-card-title class="headline">
            {{ headingmsg }}
          </v-card-title>
          <v-card-text>{{ message }}</v-card-text>
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
// eslint-disable-next-line no-unused-vars
//import {connectDFU, downloadDFU} from '../support/dfu-util/dfu-util.js'

// eslint-disable-next-line no-unused-vars
const fwbranch = require("../support/fw-branch.js");

export default {
  name: 'FlasherPage',
  
  data () {
      return {
        targets: [],
        fwversions: [],
        changelog: "",

        model: [],
        currfw: [],
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

    async flashFw() {
      var self = this;
      self.dialog = true;
      self.message = "Downloading bin...";
       
      // eslint-disable-next-line no-unused-vars
      var fwbin = await fwbranch.downloadArtifact(self.currtr, self.currfw, fwbranch.defaultRepo);
      self.dialog = false;

      self.message = "Function is not implemented yet!";
      self.dialogm = true;

      //connectDFU();
      //downloadDFU(fwbin);
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

    async updateVersions() {
      var self = this;
      self.fwversions = await fwbranch.indexArtifacts(fwbranch.defaultRepo);
    },
  },

  created() {
    this.updateVersions()
  }
}
</script>
