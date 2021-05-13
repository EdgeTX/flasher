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

          <v-sheet elevation="6" class="rounded-lg">
            <!--<v-radio-group
              v-model="row"
              row
            >
              <v-radio
                v-for="tr in targets"
                :key="tr"
                :href="'#tab-' + tr"
                :label="tr"
                :value="tr"
                @change="updateContent"
              ></v-radio>
            </v-radio-group>-->
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
            name="changelogbox"
            label="Select a firmware version to get notes"
            :value="changelog"
            solo
            readonly
          ></v-textarea>

          <br><br>

          <v-btn
              color="primary"
              block
              elevation="2"
              large
              @click="flashFw"
          >Write</v-btn>
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
            Loading firmware...
            <v-progress-linear
              indeterminate
              color="white"
              class="mb-0"
            ></v-progress-linear>
          </v-card-text>
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
        dialog: false
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
      var indexdat = await fwbranch.downloadMetadata(self.currfw, fwbranch.defaultRepo);
      console.log(indexdat);

      if (indexdat != "") {
        self.targets = indexdat.targets;
        self.changelog = indexdat.changelog;
        console.log("Changelog updated");
      } else {
        self.changelog = "Firmware does not contain any metadata, please try another revision."
      }

      self.dialog = false;
    },

    updateSw(swvalue) {
      this.currtr = swvalue[1];
    },

    async flashFw() {
      var self = this;

      var fwbin = await fwbranch.downloadArtifact(this.currtr, self.currfw, fwbranch.defaultRepo);

      //connectDFU();
      //downloadDFU(fwbin);
    },

    async updateVersions() {
      var self = this;
      self.fwversions = await fwbranch.indexArtifacts(fwbranch.defaultRepo);
      console.log(self.fwversions);
    },
  },

  created() {
    this.updateVersions()
  }
}

</script>
