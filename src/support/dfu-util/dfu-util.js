/* DFU.js */

var dfu = {};

(function() {
    'use strict';

    dfu.DETACH = 0x00;
    dfu.DNLOAD = 0x01;
    dfu.UPLOAD = 0x02;
    dfu.GETSTATUS = 0x03;
    dfu.CLRSTATUS = 0x04;
    dfu.GETSTATE = 0x05;
    dfu.ABORT = 6;

    dfu.appIDLE = 0;
    dfu.appDETACH = 1;
    dfu.dfuIDLE = 2;
    dfu.dfuDNLOAD_SYNC = 3;
    dfu.dfuDNBUSY = 4;
    dfu.dfuDNLOAD_IDLE = 5;
    dfu.dfuMANIFEST_SYNC = 6;
    dfu.dfuMANIFEST = 7;
    dfu.dfuMANIFEST_WAIT_RESET = 8;
    dfu.dfuUPLOAD_IDLE = 9;
    dfu.dfuERROR = 10;

    dfu.STATUS_OK = 0x0;

    dfu.Device = function(device, settings) {
        this.device_ = device;
        this.settings = settings;
        this.intfNumber = settings["interface"].interfaceNumber;
    };

    dfu.findDeviceDfuInterfaces = function(device) {
        let interfaces = [];
        for (let conf of device.configurations) {
            for (let intf of conf.interfaces) {
                for (let alt of intf.alternates) {
                    if (alt.interfaceClass == 0xFE &&
                        alt.interfaceSubclass == 0x01 &&
                        (alt.interfaceProtocol == 0x01 || alt.interfaceProtocol == 0x02)) {
                        let settings = {
                            "configuration": conf,
                            "interface": intf,
                            "alternate": alt,
                            "name": alt.interfaceName
                        };
                        interfaces.push(settings);
                    }
                }
            }
        }

        return interfaces;
    }

    dfu.findAllDfuInterfaces = function() {
        return navigator.usb.getDevices().then(
            devices => {
                let matches = [];
                for (let device of devices) {
                    let interfaces = dfu.findDeviceDfuInterfaces(device);
                    for (let interface_ of interfaces) {
                        matches.push(new dfu.Device(device, interface_))
                    }
                }
                return matches;
            }
        )
    };

    dfu.Device.prototype.logDebug = function(msg) {

    };

    dfu.Device.prototype.logInfo = function(msg) {
        console.log(msg);
    };

    dfu.Device.prototype.logWarning = function(msg) {
        console.log(msg);
    };

    dfu.Device.prototype.logError = function(msg) {
        console.log(msg);
    };

    dfu.Device.prototype.logProgress = function(done, total) {
        if (typeof total === 'undefined') {
            console.log(done)
        } else {
            console.log(done + '/' + total);
        }
    };

    dfu.Device.prototype.open = async function() {
        await this.device_.open();
        const confValue = this.settings.configuration.configurationValue;
        if (this.device_.configuration === null ||
            this.device_.configuration.configurationValue != confValue) {
            await this.device_.selectConfiguration(confValue);
        }

        const intfNumber = this.settings["interface"].interfaceNumber;
        if (!this.device_.configuration.interfaces[intfNumber].claimed) {
            await this.device_.claimInterface(intfNumber);
        }

        const altSetting = this.settings.alternate.alternateSetting;
        let intf = this.device_.configuration.interfaces[intfNumber];
        if (intf.alternate === null ||
            intf.alternate.alternateSetting != altSetting) {
            await this.device_.selectAlternateInterface(intfNumber, altSetting);
        }
    }

    dfu.Device.prototype.close = async function() {
        try {
            await this.device_.close();
        } catch (error) {
            console.log(error);
        }
    };

    dfu.Device.prototype.readDeviceDescriptor = function() {
        const GET_DESCRIPTOR = 0x06;
        const DT_DEVICE = 0x01;
        const wValue = (DT_DEVICE << 8);

        return this.device_.controlTransferIn({
            "requestType": "standard",
            "recipient": "device",
            "request": GET_DESCRIPTOR,
            "value": wValue,
            "index": 0
        }, 18).then(
            result => {
                if (result.status == "ok") {
                     return Promise.resolve(result.data);
                } else {
                    return Promise.reject(result.status);
                }
            }
        );
    };

    dfu.Device.prototype.readStringDescriptor = async function(index, langID) {
        if (typeof langID === 'undefined') {
            langID = 0;
        }

        const GET_DESCRIPTOR = 0x06;
        const DT_STRING = 0x03;
        const wValue = (DT_STRING << 8) | index;

        const request_setup = {
            "requestType": "standard",
            "recipient": "device",
            "request": GET_DESCRIPTOR,
            "value": wValue,
            "index": langID
        }

        // Read enough for bLength
        var result = await this.device_.controlTransferIn(request_setup, 1);

        if (result.status == "ok") {
            // Retrieve the full descriptor
            const bLength = result.data.getUint8(0);
            result = await this.device_.controlTransferIn(request_setup, bLength);
            if (result.status == "ok") {
                const len = (bLength-2) / 2;
                let u16_words = [];
                for (let i=0; i < len; i++) {
                    u16_words.push(result.data.getUint16(2+i*2, true));
                }
                if (langID == 0) {
                    // Return the langID array
                    return u16_words;
                } else {
                    // Decode from UCS-2 into a string
                    return String.fromCharCode.apply(String, u16_words);
                }
            }
        }
        
        throw `Failed to read string descriptor ${index}: ${result.status}`;
    };

    dfu.Device.prototype.readInterfaceNames = async function() {
        const DT_INTERFACE = 4;

        let configs = {};
        let allStringIndices = new Set();
        for (let configIndex=0; configIndex < this.device_.configurations.length; configIndex++) {
            const rawConfig = await this.readConfigurationDescriptor(configIndex);
            let configDesc = dfu.parseConfigurationDescriptor(rawConfig);
            let configValue = configDesc.bConfigurationValue;
            configs[configValue] = {};

            // Retrieve string indices for interface names
            for (let desc of configDesc.descriptors) {
                if (desc.bDescriptorType == DT_INTERFACE) {
                    if (!(desc.bInterfaceNumber in configs[configValue])) {
                        configs[configValue][desc.bInterfaceNumber] = {};
                    }
                    configs[configValue][desc.bInterfaceNumber][desc.bAlternateSetting] = desc.iInterface;
                    if (desc.iInterface > 0) {
                        allStringIndices.add(desc.iInterface);
                    }
                }
            }
        }

        let strings = {};
        // Retrieve interface name strings
        for (let index of allStringIndices) {
            try {
                strings[index] = await this.readStringDescriptor(index, 0x0409);
            } catch (error) {
                console.log(error);
                strings[index] = null;
            }
        }

        for (let configValue in configs) {
            for (let intfNumber in configs[configValue]) {
                for (let alt in configs[configValue][intfNumber]) {
                    const iIndex = configs[configValue][intfNumber][alt];
                    configs[configValue][intfNumber][alt] = strings[iIndex];
                }
            }
        }

        return configs;
    };

    dfu.parseDeviceDescriptor = function(data) {
        return {
            bLength:            data.getUint8(0),
            bDescriptorType:    data.getUint8(1),
            bcdUSB:             data.getUint16(2, true),
            bDeviceClass:       data.getUint8(4),
            bDeviceSubClass:    data.getUint8(5),
            bDeviceProtocol:    data.getUint8(6),
            bMaxPacketSize:     data.getUint8(7),
            idVendor:           data.getUint16(8, true),
            idProduct:          data.getUint16(10, true),
            bcdDevice:          data.getUint16(12, true),
            iManufacturer:      data.getUint8(14),
            iProduct:           data.getUint8(15),
            iSerialNumber:      data.getUint8(16),
            bNumConfigurations: data.getUint8(17),
        };
    };

    dfu.parseConfigurationDescriptor = function(data) {
        let descriptorData = new DataView(data.buffer.slice(9));
        let descriptors = dfu.parseSubDescriptors(descriptorData);
        return {
            bLength:            data.getUint8(0),
            bDescriptorType:    data.getUint8(1),
            wTotalLength:       data.getUint16(2, true),
            bNumInterfaces:     data.getUint8(4),
            bConfigurationValue:data.getUint8(5),
            iConfiguration:     data.getUint8(6),
            bmAttributes:       data.getUint8(7),
            bMaxPower:          data.getUint8(8),
            descriptors:        descriptors
        };
    };

    dfu.parseInterfaceDescriptor = function(data) {
        return {
            bLength:            data.getUint8(0),
            bDescriptorType:    data.getUint8(1),
            bInterfaceNumber:   data.getUint8(2),
            bAlternateSetting:  data.getUint8(3),
            bNumEndpoints:      data.getUint8(4),
            bInterfaceClass:    data.getUint8(5),
            bInterfaceSubClass: data.getUint8(6),
            bInterfaceProtocol: data.getUint8(7),
            iInterface:         data.getUint8(8),
            descriptors:        []
        };
    };

    dfu.parseFunctionalDescriptor = function(data) {
        return {
            bLength:           data.getUint8(0),
            bDescriptorType:   data.getUint8(1),
            bmAttributes:      data.getUint8(2),
            wDetachTimeOut:    data.getUint16(3, true),
            wTransferSize:     data.getUint16(5, true),
            bcdDFUVersion:     data.getUint16(7, true)
        };
    };

    dfu.parseSubDescriptors = function(descriptorData) {
        const DT_INTERFACE = 4;
        const DT_ENDPOINT = 5;
        const DT_DFU_FUNCTIONAL = 0x21;
        const USB_CLASS_APP_SPECIFIC = 0xFE;
        const USB_SUBCLASS_DFU = 0x01;
        let remainingData = descriptorData;
        let descriptors = [];
        let currIntf;
        let inDfuIntf = false;
        while (remainingData.byteLength > 2) {
            let bLength = remainingData.getUint8(0);
            let bDescriptorType = remainingData.getUint8(1);
            let descData = new DataView(remainingData.buffer.slice(0, bLength));
            if (bDescriptorType == DT_INTERFACE) {
                currIntf = dfu.parseInterfaceDescriptor(descData);
                if (currIntf.bInterfaceClass == USB_CLASS_APP_SPECIFIC &&
                    currIntf.bInterfaceSubClass == USB_SUBCLASS_DFU) {
                    inDfuIntf = true;
                } else {
                    inDfuIntf = false;
                }
                descriptors.push(currIntf);
            } else if (inDfuIntf && bDescriptorType == DT_DFU_FUNCTIONAL) {
                let funcDesc = dfu.parseFunctionalDescriptor(descData)
                descriptors.push(funcDesc);
                currIntf.descriptors.push(funcDesc);
            } else {
                let desc = {
                    bLength: bLength,
                    bDescriptorType: bDescriptorType,
                    data: descData
                };
                descriptors.push(desc);
                if (currIntf) {
                    currIntf.descriptors.push(desc);
                }
            }
            remainingData = new DataView(remainingData.buffer.slice(bLength));
        }

        return descriptors;
    };

    dfu.Device.prototype.readConfigurationDescriptor = function(index) {
        const GET_DESCRIPTOR = 0x06;
        const DT_CONFIGURATION = 0x02;
        const wValue = ((DT_CONFIGURATION << 8) | index);

        return this.device_.controlTransferIn({
            "requestType": "standard",
            "recipient": "device",
            "request": GET_DESCRIPTOR,
            "value": wValue,
            "index": 0
        }, 4).then(
            result => {
                if (result.status == "ok") {
                    // Read out length of the configuration descriptor
                    let wLength = result.data.getUint16(2, true);
                    return this.device_.controlTransferIn({
                        "requestType": "standard",
                        "recipient": "device",
                        "request": GET_DESCRIPTOR,
                        "value": wValue,
                        "index": 0
                    }, wLength);
                } else {
                    return Promise.reject(result.status);
                }
            }
        ).then(
            result => {
                if (result.status == "ok") {
                    return Promise.resolve(result.data);
                } else {
                    return Promise.reject(result.status);
                }
            }
        );
    };

    dfu.Device.prototype.requestOut = function(bRequest, data, wValue=0) {
        return this.device_.controlTransferOut({
            "requestType": "class",
            "recipient": "interface",
            "request": bRequest,
            "value": wValue,
            "index": this.intfNumber
        }, data).then(
            result => {
                if (result.status == "ok") {
                    return Promise.resolve(result.bytesWritten);
                } else {
                    return Promise.reject(result.status);
                }
            },
            error => {
                return Promise.reject("ControlTransferOut failed: " + error);
            }
        );
    };

    dfu.Device.prototype.requestIn = function(bRequest, wLength, wValue=0) {
        return this.device_.controlTransferIn({
            "requestType": "class",
            "recipient": "interface",
            "request": bRequest,
            "value": wValue,
            "index": this.intfNumber
        }, wLength).then(
            result => {
                if (result.status == "ok") {
                    return Promise.resolve(result.data);
                } else {
                    return Promise.reject(result.status);
                }
            },
            error => {
                return Promise.reject("ControlTransferIn failed: " + error);
            }
        );
    };

    dfu.Device.prototype.detach = function() {
        return this.requestOut(dfu.DETACH, undefined, 1000);
    }

    dfu.Device.prototype.waitDisconnected = async function(timeout) {
        let device = this;
        let usbDevice = this.device_;
        return new Promise(function(resolve, reject) {
            let timeoutID;
            if (timeout > 0) {
                function onTimeout() {
                    navigator.usb.removeEventListener("disconnect", onDisconnect);
                    if (device.disconnected !== true) {
                        reject("Disconnect timeout expired");
                    }
                }
                timeoutID = setTimeout(reject, timeout);
            }

            function onDisconnect(event) {
                if (event.device === usbDevice) {
                    if (timeout > 0) {
                        clearTimeout(timeoutID);
                    }
                    device.disconnected = true;
                    navigator.usb.removeEventListener("disconnect", onDisconnect);
                    event.stopPropagation();
                    resolve(device);
                }
            }

            navigator.usb.addEventListener("disconnect", onDisconnect);
        });
    };

    dfu.Device.prototype.download = function(data, blockNum) {
        return this.requestOut(dfu.DNLOAD, data, blockNum);
    };

    dfu.Device.prototype.dnload = dfu.Device.prototype.download;

    dfu.Device.prototype.upload = function(length, blockNum) {
        return this.requestIn(dfu.UPLOAD, length, blockNum)
    };

    dfu.Device.prototype.clearStatus = function() {
        return this.requestOut(dfu.CLRSTATUS);
    };

    dfu.Device.prototype.clrStatus = dfu.Device.prototype.clearStatus;

    dfu.Device.prototype.getStatus = function() {
        return this.requestIn(dfu.GETSTATUS, 6).then(
            data =>
                Promise.resolve({
                    "status": data.getUint8(0),
                    "pollTimeout": data.getUint32(1, true) & 0xFFFFFF,
                    "state": data.getUint8(4)
                }),
            error =>
                Promise.reject("DFU GETSTATUS failed: " + error)
        );
    };

    dfu.Device.prototype.getState = function() {
        return this.requestIn(dfu.GETSTATE, 1).then(
            data => Promise.resolve(data.getUint8(0)),
            error => Promise.reject("DFU GETSTATE failed: " + error)
        );
    };

    dfu.Device.prototype.abort = function() {
        return this.requestOut(dfu.ABORT);
    };

    dfu.Device.prototype.abortToIdle = async function() {
        await this.abort();
        let state = await this.getState();
        if (state == dfu.dfuERROR) {
            await this.clearStatus();
            state = await this.getState();
        }
        if (state != dfu.dfuIDLE) {
            throw "Failed to return to idle state after abort: state " + state.state;
        }
    };

    dfu.Device.prototype.do_upload = async function(xfer_size, max_size=Infinity, first_block=0) {
        let transaction = first_block;
        let blocks = [];
        let bytes_read = 0;

        this.logInfo("Copying data from DFU device to browser");
        // Initialize progress to 0
        this.logProgress(0);

        let result;
        let bytes_to_read;
        do {
            bytes_to_read = Math.min(xfer_size, max_size - bytes_read);
            result = await this.upload(bytes_to_read, transaction++);
            this.logDebug("Read " + result.byteLength + " bytes");
            if (result.byteLength > 0) {
                blocks.push(result);
                bytes_read += result.byteLength;
            }
            if (Number.isFinite(max_size)) {
                this.logProgress(bytes_read, max_size);
            } else {
                this.logProgress(bytes_read);
            }
        } while ((bytes_read < max_size) && (result.byteLength == bytes_to_read));

        if (bytes_read == max_size) {
            await this.abortToIdle();
        }

        this.logInfo(`Read ${bytes_read} bytes`);

        return new Blob(blocks, { type: "application/octet-stream" });
    };

    dfu.Device.prototype.poll_until = async function(state_predicate) {
        let dfu_status = await this.getStatus();

        let device = this;
        function async_sleep(duration_ms) {
            return new Promise(function(resolve, reject) {
                device.logDebug("Sleeping for " + duration_ms + "ms");
                setTimeout(resolve, duration_ms);
            });
        }
        
        while (!state_predicate(dfu_status.state) && dfu_status.state != dfu.dfuERROR) {
            await async_sleep(dfu_status.pollTimeout);
            dfu_status = await this.getStatus();
        }

        return dfu_status;
    };

    dfu.Device.prototype.poll_until_idle = function(idle_state) {
        return this.poll_until(state => (state == idle_state));
    };

    dfu.Device.prototype.do_download = async function(xfer_size, data, manifestationTolerant) {
        let bytes_sent = 0;
        let expected_size = data.byteLength;
        let transaction = 0;

        this.logInfo("Copying data from browser to DFU device");

        // Initialize progress to 0
        this.logProgress(bytes_sent, expected_size);

        while (bytes_sent < expected_size) {
            const bytes_left = expected_size - bytes_sent;
            const chunk_size = Math.min(bytes_left, xfer_size);

            let bytes_written = 0;
            let dfu_status;
            try {
                bytes_written = await this.download(data.slice(bytes_sent, bytes_sent+chunk_size), transaction++);
                this.logDebug("Sent " + bytes_written + " bytes");
                dfu_status = await this.poll_until_idle(dfu.dfuDNLOAD_IDLE);
            } catch (error) {
                throw "Error during DFU download: " + error;
            }

            if (dfu_status.status != dfu.STATUS_OK) {
                throw `DFU DOWNLOAD failed state=${dfu_status.state}, status=${dfu_status.status}`;
            }

            this.logDebug("Wrote " + bytes_written + " bytes");
            bytes_sent += bytes_written;

            this.logProgress(bytes_sent, expected_size);
        }

        this.logDebug("Sending empty block");
        try {
            await this.download(new ArrayBuffer([]), transaction++);
        } catch (error) {
            throw "Error during final DFU download: " + error;
        }

        this.logInfo("Wrote " + bytes_sent + " bytes");
        this.logInfo("Manifesting new firmware");

        if (manifestationTolerant) {
            // Transition to MANIFEST_SYNC state
            let dfu_status;
            try {
                // Wait until it returns to idle.
                // If it's not really manifestation tolerant, it might transition to MANIFEST_WAIT_RESET
                dfu_status = await this.poll_until(state => (state == dfu.dfuIDLE || state == dfu.dfuMANIFEST_WAIT_RESET));
                if (dfu_status.state == dfu.dfuMANIFEST_WAIT_RESET) {
                    this.logDebug("Device transitioned to MANIFEST_WAIT_RESET even though it is manifestation tolerant");
                }
                if (dfu_status.status != dfu.STATUS_OK) {
                    throw `DFU MANIFEST failed state=${dfu_status.state}, status=${dfu_status.status}`;
                }
            } catch (error) {
                if (error.endsWith("ControlTransferIn failed: NotFoundError: Device unavailable.") ||
                    error.endsWith("ControlTransferIn failed: NotFoundError: The device was disconnected.")) {
                    this.logWarning("Unable to poll final manifestation status");
                } else {
                    throw "Error during DFU manifest: " + error;
                }
            }
        } else {
            // Try polling once to initiate manifestation
            try {
                let final_status = await this.getStatus();
                this.logDebug(`Final DFU status: state=${final_status.state}, status=${final_status.status}`);
            } catch (error) {
                this.logDebug("Manifest GET_STATUS poll error: " + error);
            }
        }

        // Reset to exit MANIFEST_WAIT_RESET
        try {
            await this.device_.reset();
        } catch (error) {
            if (error == "NetworkError: Unable to reset the device." ||
                error == "NotFoundError: Device unavailable." ||
                error == "NotFoundError: The device was disconnected.") {
                this.logDebug("Ignored reset error");
            } else {
                throw "Error during reset for manifestation: " + error;
            }
        }

        return;
    };
    
})();

/* dfuse.js */

/* dfu.js must be included before dfuse.js */

var dfuse = {};

(function() {
    'use strict';

    dfuse.GET_COMMANDS = 0x00;
    dfuse.SET_ADDRESS = 0x21;
    dfuse.ERASE_SECTOR = 0x41;

    dfuse.Device = function(device, settings) {
        dfu.Device.call(this, device, settings);
        this.memoryInfo = null;
        this.startAddress = NaN;
        if (settings.name) {
            this.memoryInfo = dfuse.parseMemoryDescriptor(settings.name);
        }
    }

    dfuse.Device.prototype = Object.create(dfu.Device.prototype);
    dfuse.Device.prototype.constructor = dfuse.Device;

    dfuse.parseMemoryDescriptor = function(desc) {
        const nameEndIndex = desc.indexOf("/");
        if (!desc.startsWith("@") || nameEndIndex == -1) {
            throw `Not a DfuSe memory descriptor: "${desc}"`;
        }

        const name = desc.substring(1, nameEndIndex).trim();
        const segmentString = desc.substring(nameEndIndex);

        let segments = [];

        const sectorMultipliers = {
            ' ': 1,
            'B': 1,
            'K': 1024,
            'M': 1048576
        };

        let contiguousSegmentRegex = /\/\s*(0x[0-9a-fA-F]{1,8})\s*\/(\s*[0-9]+\s*\*\s*[0-9]+\s?[ BKM]\s*[abcdefg]\s*,?\s*)+/g;
        let contiguousSegmentMatch;
        while (contiguousSegmentMatch = contiguousSegmentRegex.exec(segmentString)) {
            let segmentRegex = /([0-9]+)\s*\*\s*([0-9]+)\s?([ BKM])\s*([abcdefg])\s*,?\s*/g;
            let startAddress = parseInt(contiguousSegmentMatch[1], 16);
            let segmentMatch;
            while (segmentMatch = segmentRegex.exec(contiguousSegmentMatch[0])) {
                let segment = {}
                let sectorCount = parseInt(segmentMatch[1], 10);
                let sectorSize = parseInt(segmentMatch[2]) * sectorMultipliers[segmentMatch[3]];
                let properties = segmentMatch[4].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
                segment.start = startAddress;
                segment.sectorSize = sectorSize;
                segment.end = startAddress + sectorSize * sectorCount;
                segment.readable = (properties & 0x1) != 0;
                segment.erasable = (properties & 0x2) != 0;
                segment.writable = (properties & 0x4) != 0;
                segments.push(segment);

                startAddress += sectorSize * sectorCount;
            }
        }

        return {"name": name, "segments": segments};
    };

    dfuse.Device.prototype.dfuseCommand = async function(command, param, len) {
        if (typeof param === 'undefined' && typeof len === 'undefined') {
            param = 0x00;
            len = 1;
        }

        const commandNames = {
            0x00: "GET_COMMANDS",
            0x21: "SET_ADDRESS",
            0x41: "ERASE_SECTOR"
        };

        let payload = new ArrayBuffer(len + 1);
        let view = new DataView(payload);
        view.setUint8(0, command);
        if (len == 1) {
            view.setUint8(1, param);
        } else if (len == 4) {
            view.setUint32(1, param, true);
        } else {
            throw "Don't know how to handle data of len " + len;
        }

        try {
            await this.download(payload, 0);
        } catch (error) {
            throw "Error during special DfuSe command " + commandNames[command] + ":" + error;
        }

        let status = await this.poll_until(state => (state != dfu.dfuDNBUSY));
        if (status.status != dfu.STATUS_OK) {
            throw "Special DfuSe command " + commandName + " failed";
        }
    };

    dfuse.Device.prototype.getSegment = function(addr) {
        if (!this.memoryInfo || ! this.memoryInfo.segments) {
            throw "No memory map information available";
        }

        for (let segment of this.memoryInfo.segments) {
            if (segment.start <= addr && addr < segment.end) {
                return segment;
            }
        }

        return null;
    };

    dfuse.Device.prototype.getSectorStart = function(addr, segment) {
        if (typeof segment === 'undefined') {
            segment = this.getSegment(addr);
        }

        if (!segment) {
            throw `Address ${addr.toString(16)} outside of memory map`;
        }

        const sectorIndex = Math.floor((addr - segment.start)/segment.sectorSize);
        return segment.start + sectorIndex * segment.sectorSize;
    };

    dfuse.Device.prototype.getSectorEnd = function(addr, segment) {
        if (typeof segment === 'undefined') {
            segment = this.getSegment(addr);
        }

        if (!segment) {
            throw `Address ${addr.toString(16)} outside of memory map`;
        }

        const sectorIndex = Math.floor((addr - segment.start)/segment.sectorSize);
        return segment.start + (sectorIndex + 1) * segment.sectorSize;
    };

    dfuse.Device.prototype.getFirstWritableSegment = function() {
        if (!this.memoryInfo || ! this.memoryInfo.segments) {
            throw "No memory map information available";
        }

        for (let segment of this.memoryInfo.segments) {
            if (segment.writable) {
                return segment;
            }
        }

        return null;
    };

    dfuse.Device.prototype.getMaxReadSize = function(startAddr) {
        if (!this.memoryInfo || ! this.memoryInfo.segments) {
            throw "No memory map information available";
        }

        let numBytes = 0;
        for (let segment of this.memoryInfo.segments) {
            if (segment.start <= startAddr && startAddr < segment.end) {
                // Found the first segment the read starts in
                if (segment.readable) {
                    numBytes += segment.end - startAddr;
                } else {
                    return 0;
                }
            } else if (segment.start == startAddr + numBytes) {
                // Include a contiguous segment
                if (segment.readable) {
                    numBytes += (segment.end - segment.start);
                } else {
                    break;
                }
            }
        }

        return numBytes;
    };

    dfuse.Device.prototype.erase = async function(startAddr, length) {
        let segment = this.getSegment(startAddr);
        let addr = this.getSectorStart(startAddr, segment);
        const endAddr = this.getSectorEnd(startAddr + length - 1);

        let bytesErased = 0;
        const bytesToErase = endAddr - addr;
        if (bytesToErase > 0) {
            this.logProgress(bytesErased, bytesToErase);
        }

        while (addr < endAddr) {
            if (segment.end <= addr) {
                segment = this.getSegment(addr);
            }
            if (!segment.erasable) {
                // Skip over the non-erasable section
                bytesErased = Math.min(bytesErased + segment.end - addr, bytesToErase);
                addr = segment.end;
                this.logProgress(bytesErased, bytesToErase);
                continue;
            }
            const sectorIndex = Math.floor((addr - segment.start)/segment.sectorSize);
            const sectorAddr = segment.start + sectorIndex * segment.sectorSize;
            this.logDebug(`Erasing ${segment.sectorSize}B at 0x${sectorAddr.toString(16)}`);
            await this.dfuseCommand(dfuse.ERASE_SECTOR, sectorAddr, 4);
            addr = sectorAddr + segment.sectorSize;
            bytesErased += segment.sectorSize;
            this.logProgress(bytesErased, bytesToErase);
        }
    };

    dfuse.Device.prototype.do_download = async function(xfer_size, data, manifestationTolerant) {
        if (!this.memoryInfo || ! this.memoryInfo.segments) {
            throw "No memory map available";
        }

        this.logInfo("Erasing DFU device memory");
        
        let bytes_sent = 0;
        let expected_size = data.byteLength;

        let startAddress = this.startAddress;
        if (isNaN(startAddress)) {
            startAddress = this.memoryInfo.segments[0].start;
            this.logWarning("Using inferred start address 0x" + startAddress.toString(16));
        } else if (this.getSegment(startAddress) === null) {
            this.logError(`Start address 0x${startAddress.toString(16)} outside of memory map bounds`);
        }
        await this.erase(startAddress, expected_size);

        this.logInfo("Copying data from browser to DFU device");

        let address = startAddress;
        while (bytes_sent < expected_size) {
            const bytes_left = expected_size - bytes_sent;
            const chunk_size = Math.min(bytes_left, xfer_size);

            let bytes_written = 0;
            let dfu_status;
            try {
                await this.dfuseCommand(dfuse.SET_ADDRESS, address, 4);
                this.logDebug(`Set address to 0x${address.toString(16)}`);
                bytes_written = await this.download(data.slice(bytes_sent, bytes_sent+chunk_size), 2);
                this.logDebug("Sent " + bytes_written + " bytes");
                dfu_status = await this.poll_until_idle(dfu.dfuDNLOAD_IDLE);
                address += chunk_size;
            } catch (error) {
                throw "Error during DfuSe download: " + error;
            }

            if (dfu_status.status != dfu.STATUS_OK) {
                throw `DFU DOWNLOAD failed state=${dfu_status.state}, status=${dfu_status.status}`;
            }

            this.logDebug("Wrote " + bytes_written + " bytes");
            bytes_sent += bytes_written;

            this.logProgress(bytes_sent, expected_size);
        }
        this.logInfo(`Wrote ${bytes_sent} bytes`);

        this.logInfo("Manifesting new firmware");
        try {
            await this.dfuseCommand(dfuse.SET_ADDRESS, startAddress, 4);
            await this.download(new ArrayBuffer(), 0);
        } catch (error) {
            throw "Error during DfuSe manifestation: " + error;
        }

        try {
            await this.poll_until(state => (state == dfu.dfuMANIFEST));
        } catch (error) {
            this.logError(error);
        }
    }

    dfuse.Device.prototype.do_upload = async function(xfer_size, max_size) {
        let startAddress = this.startAddress;
        if (isNaN(startAddress)) {
            startAddress = this.memoryInfo.segments[0].start;
            this.logWarning("Using inferred start address 0x" + startAddress.toString(16));
        } else if (this.getSegment(startAddress) === null) {
            this.logWarning(`Start address 0x${startAddress.toString(16)} outside of memory map bounds`);
        }

        this.logInfo(`Reading up to 0x${max_size.toString(16)} bytes starting at 0x${startAddress.toString(16)}`);
        let state = await this.getState();
        if (state != dfu.dfuIDLE) {
            await this.abortToIdle();
        }
        await this.dfuseCommand(dfuse.SET_ADDRESS, startAddress, 4);
        await this.abortToIdle();

        // DfuSe encodes the read address based on the transfer size,
        // the block number - 2, and the SET_ADDRESS pointer.
        return await dfu.Device.prototype.do_upload.call(this, xfer_size, max_size, 2);
    }
})();

/* DFU-util.js */
var device = null;

function hex4(n) {
    let s = n.toString(16)
    while (s.length < 4) {
        s = '0' + s;
    }
    return s;
}

function hexAddr8(n) {
    let s = n.toString(16)
    while (s.length < 8) {
        s = '0' + s;
    }
    return "0x" + s;
}

function niceSize(n) {
    const gigabyte = 1024 * 1024 * 1024;
    const megabyte = 1024 * 1024;
    const kilobyte = 1024;
    if (n >= gigabyte) {
        return n / gigabyte + "GiB";
    } else if (n >= megabyte) {
        return n / megabyte + "MiB";
    } else if (n >= kilobyte) {
        return n / kilobyte + "KiB";
    } else {
        return n + "B";
    }
}

function formatDFUSummary(device) {
    const vid = hex4(device.device_.vendorId);
    const pid = hex4(device.device_.productId);
    const name = device.device_.productName;

    let mode = "Unknown"
    if (device.settings.alternate.interfaceProtocol == 0x01) {
        mode = "Runtime";
    } else if (device.settings.alternate.interfaceProtocol == 0x02) {
        mode = "DFU";
    }

    const cfg = device.settings.configuration.configurationValue;
    const intf = device.settings["interface"].interfaceNumber;
    const alt = device.settings.alternate.alternateSetting;
    const serial = device.device_.serialNumber;
    let info = `${mode}: [${vid}:${pid}] cfg=${cfg}, intf=${intf}, alt=${alt}, name="${name}" serial="${serial}"`;
    return info;
}

function formatDFUInterfaceAlternate(settings) {
    let mode = "Unknown"
    if (settings.alternate.interfaceProtocol == 0x01) {
        mode = "Runtime";
    } else if (settings.alternate.interfaceProtocol == 0x02) {
        mode = "DFU";
    }

    const cfg = settings.configuration.configurationValue;
    const intf = settings["interface"].interfaceNumber;
    const alt = settings.alternate.alternateSetting;
    const name = (settings.name) ? settings.name : "UNKNOWN";

    return `${mode}: cfg=${cfg}, intf=${intf}, alt=${alt}, name="${name}"`;
}

async function fixInterfaceNames(device_, interfaces) {
    // Check if any interface names were not read correctly
    if (interfaces.some(intf => (intf.name == null))) {
        // Manually retrieve the interface name string descriptors
        let tempDevice = new dfu.Device(device_, interfaces[0]);
        await tempDevice.device_.open();
        await tempDevice.device_.selectConfiguration(1);
        let mapping = await tempDevice.readInterfaceNames();
        await tempDevice.close();

        for (let intf of interfaces) {
            if (intf.name === null) {
                let configIndex = intf.configuration.configurationValue;
                let intfNumber = intf["interface"].interfaceNumber;
                let alt = intf.alternate.alternateSetting;
                intf.name = mapping[configIndex][intfNumber][alt];
            }
        }
    }
}

function populateInterfaceList(form, device_, interfaces) {
    let old_choices = Array.from(form.getElementsByTagName("div"));
    for (let radio_div of old_choices) {
        form.removeChild(radio_div);
    }

    let button = form.getElementsByTagName("button")[0];

    for (let i=0; i < interfaces.length; i++) {
        let radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "interfaceIndex";
        radio.value = i;
        radio.id = "interface" + i;
        radio.required = true;

        let label = document.createElement("label");
        label.textContent = formatDFUInterfaceAlternate(interfaces[i]);
        label.className = "radio"
        label.setAttribute("for", "interface" + i);

        let div = document.createElement("div");
        div.appendChild(radio);
        div.appendChild(label);
        form.insertBefore(div, button);
    }
}

function getDFUDescriptorProperties(device) {
    // Attempt to read the DFU functional descriptor
    // TODO: read the selected configuration's descriptor
    return device.readConfigurationDescriptor(0).then(
        data => {
            let configDesc = dfu.parseConfigurationDescriptor(data);
            let funcDesc = null;
            let configValue = device.settings.configuration.configurationValue;
            if (configDesc.bConfigurationValue == configValue) {
                for (let desc of configDesc.descriptors) {
                    if (desc.bDescriptorType == 0x21 && desc.hasOwnProperty("bcdDFUVersion")) {
                        funcDesc = desc;
                        break;
                    }
                }
            }

            if (funcDesc) {
                return {
                    WillDetach:            ((funcDesc.bmAttributes & 0x08) != 0),
                    ManifestationTolerant: ((funcDesc.bmAttributes & 0x04) != 0),
                    CanUpload:             ((funcDesc.bmAttributes & 0x02) != 0),
                    CanDnload:             ((funcDesc.bmAttributes & 0x01) != 0),
                    TransferSize:          funcDesc.wTransferSize,
                    DetachTimeOut:         funcDesc.wDetachTimeOut,
                    DFUVersion:            funcDesc.bcdDFUVersion
                };
            } else {
                return {};
            }
        },
        error => {}
    );
}

// Current log div element to append to
let logContext = null;

function setLogContext(div) {
    logContext = div;
};

function clearLog(context) {
    if (typeof context === 'undefined') {
        context = logContext;
    }
    if (context) {
        context.innerHTML = "";
    }
}

function logDebug(msg) {
    console.log(msg);
}

function logInfo(msg) {
    if (logContext) {
        let info = document.createElement("p");
        info.className = "info";
        info.textContent = msg;
        logContext.appendChild(info);
    }
}

function logWarning(msg) {
    if (logContext) {
        let warning = document.createElement("p");
        warning.className = "warning";
        warning.textContent = msg;
        logContext.appendChild(warning);
    }
}

function logError(msg) {
    if (logContext) {
        let error = document.createElement("p");
        error.className = "error";
        error.textContent = msg;
        logContext.appendChild(error);
    }
}

function logProgress(done, total) {
    if (logContext) {
        let progressBar;
        if (logContext.lastChild.tagName.toLowerCase() == "progress") {
            progressBar = logContext.lastChild;
        }
        if (!progressBar) {
            progressBar = document.createElement("progress");
            logContext.appendChild(progressBar);
        }
        progressBar.value = done;
        if (typeof total !== 'undefined') {
            progressBar.max = total;
        }
    }
}

//document.addEventListener('DOMContentLoaded', event => {
let vid = parseInt("0x483", 16);
let transferSize = parseInt("1024");
let manifestationTolerant = true;
var canDownload;
let serial = "";

function onUnexpectedDisconnect(event) {
    if (device !== null && device.device_ !== null) {
        if (device.device_ === event.device) {
            device.disconnected = true;
            device = null;
        }
    }
}

function onDisconnect(err = "") {
    if (err == "") {
        console.log("Successfully finished task!")
    } else {
        console.log("Task finished with error: "+err)
    }
}

async function connect(device) {
    try {
        await device.open();
    } catch (error) {
        onDisconnect(error);
        throw error;
    }

    // Attempt to parse the DFU functional descriptor
    let desc = {};
    try {
        desc = await getDFUDescriptorProperties(device);
    } catch (error) {
        onDisconnect(error);
        throw error;
    }

    let memorySummary = "";
    if (desc && Object.keys(desc).length > 0) {
        device.properties = desc;
        transferSize = desc.TransferSize;
        if (desc.CanDnload) {
            manifestationTolerant = desc.ManifestationTolerant;
        }

        if (device.settings.alternate.interfaceProtocol == 0x02) {
            if (!desc.CanDnload) {
                canDownload = false;
            }
        }

        if (desc.DFUVersion == 0x011a && device.settings.alternate.interfaceProtocol == 0x02) {
            device = new dfuse.Device(device.device_, device.settings);
            if (device.memoryInfo) {
                let totalSize = 0;
                for (let segment of device.memoryInfo.segments) {
                    totalSize += segment.end - segment.start;
                }
                for (let segment of device.memoryInfo.segments) {
                    let properties = [];
                    if (segment.readable) {
                        properties.push("readable");
                    }
                    if (segment.erasable) {
                        properties.push("erasable");
                    }
                    if (segment.writable) {
                        properties.push("writable");
                    }
                    let propertySummary = properties.join(", ");
                    if (!propertySummary) {
                        propertySummary = "inaccessible";
                    }
                }
            }
        }
    }

    // Bind logging methods
    device.logDebug = logDebug;
    device.logInfo = logInfo;
    device.logWarning = logWarning;
    device.logError = logError;
    device.logProgress = logProgress;

    // Clear logs
    //clearLog(uploadLog);
    //clearLog(downloadLog);

    if (device.memoryInfo) {
        let segment = device.getFirstWritableSegment();
        if (segment) {
            device.startAddress = segment.start;
        }
    }

    return device;
}

function autoConnect(vid, serial) {
    dfu.findAllDfuInterfaces().then(
        async dfu_devices => {
            let matching_devices = [];
            for (let dfu_device of dfu_devices) {
                if (serial) {
                    if (dfu_device.device_.serialNumber == serial) {
                        matching_devices.push(dfu_device);
                    }
                } else if (dfu_device.device_.vendorId == vid) {
                    matching_devices.push(dfu_device);
                }
            }

            if (matching_devices.length == 0) {
            } else {
                if (matching_devices.length == 1) {
                    device = matching_devices[0];
                    device = await connect(device);
                } else {
                    console.log("Multiple DFU interfaces found.");
                }
                vidField.value = "0x" + hex4(matching_devices[0].device_.vendorId).toUpperCase();
                vid = matching_devices[0].device_.vendorId;
            }
        }
    );
}

function connectDFU() {
    if (device) {
        device.close().then(onDisconnect);
        device = null;
    } else {
        let filters = [];
        if (serial) {
            filters.push({ 'serialNumber': serial });
        } else if (vid) {
            filters.push({ 'vendorId': vid });
        }
        navigator.usb.requestDevice({ 'filters': filters }).then(
            async selectedDevice => {
                let interfaces = dfu.findDeviceDfuInterfaces(selectedDevice);
                if (interfaces.length == 0) {
                    console.log(selectedDevice);
                } else if (interfaces.length == 1) {
                    await fixInterfaceNames(selectedDevice, interfaces);
                    device = await connect(new dfu.Device(selectedDevice, interfaces[0]));
                } else {
                    await fixInterfaceNames(selectedDevice, interfaces);
                    //populateInterfaceList(interfaceForm, selectedDevice, interfaces);
                    async function connectToSelectedInterface() {
                        const index = 0;
                        device = await connect(new dfu.Device(selectedDevice, interfaces[index]));
                    }

                    connectToSelectedInterface();
                }
            }
        ).catch(error => {
            console.log(error)
        });
    }
}

function detachDFU() {
    if (device) {
        device.detach().then(
            async len => {
                let detached = false;
                try {
                    await device.close();
                    await device.waitDisconnected(5000);
                    detached = true;
                } catch (err) {
                    console.log("Detach failed: " + err);
                }

                onDisconnect();
                device = null;
                if (detached) {
                    // Wait a few seconds and try reconnecting
                    setTimeout(autoConnect, 5000);
                }
            },
            async error => {
                await device.close();
                onDisconnect(error);
                device = null;
            }
        );
    }
}

async function downloadDFU(firmwareFile) {

    if (device && firmwareFile != null) {
        //setLogContext(downloadLog);
        //clearLog(downloadLog);
        try {
            let status = await device.getStatus();
            if (status.state == dfu.dfuERROR) {
                await device.clearStatus();
            }
        } catch (error) {
            device.logWarning("Failed to clear status");
        }
        await device.do_download(transferSize, firmwareFile, manifestationTolerant).then(
            () => {
                logInfo("Done!");
                setLogContext(null);
                if (!manifestationTolerant) {
                    device.waitDisconnected(5000).then(
                        dev => {
                            onDisconnect();
                            device = null;
                        },
                        error => {
                            // It didn't reset and disconnect for some reason...
                            console.log("Device unexpectedly tolerated manifestation.");
                        }
                    );
                }
            },
            error => {
                logError(error);
                setLogContext(null);
            }
        )
    }
    //return false;
}

// Check if WebUSB is available
if (typeof navigator.usb !== 'undefined') {
    navigator.usb.addEventListener("disconnect", onUnexpectedDisconnect);
}

export {connectDFU, detachDFU, downloadDFU}