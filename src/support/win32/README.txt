dfu-util 0.10 binaries (Windows 32-bit)

These Windows binaries were built using MinGW on Ubuntu 20.04
and the instructions on http://dfu-util.sourceforge.net/build.html

The dfu-util source was from the 0.10 release tarball.

The libusb source was from latest git 2020-11-21 (pre-1.0.24)
commit v1.0.23-179-g9d23ed2

The lsusb.exe utility was built from usbutils commit v013-2-gbc48602
with the patch lsusb_build_on_mingw.patch applied.

Windows OS releases older than Vista are not supported.
