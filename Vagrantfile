Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"

  config.vm.synced_folder ".", "/vagrant"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = 4096
    vb.cpus = 2
  end

  config.vm.network "forwarded_port", guest: 5173, host: 5173, auto_correct: true
  config.vm.network "forwarded_port", guest: 5000, host: 5000, auto_correct: true
end
