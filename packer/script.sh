#!/bin/bash
sudo yum update
sudo yum upgrade
sudo amazon-linux-extras install -y nginx1
sudo amazon-linux-extras install -y epel
# sudo yum remove libuv -y
# sudo yum install libuv --disableplugin=priorities
sudo yum install -y curl
curl -sL https://rpm.nodesource.com/setup_16.x | sudo -E bash -
sudo yum install -y nodejs
sudo curl -o amazon-cloudwatch-agent.rpm https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U amazon-cloudwatch-agent.rpm
touch config.json
cat <<EOF >> config.json
{
  "agent": {
    "metrics_collection_interval": 10,
    "logfile": "/var/logs/amazon-cloudwatch-agent.log"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": " /home/ec2-user/webapp/logs/csye6225.log",
            "log_group_name": "csye6225",
            "log_stream_name": "webapp"
          }
        ]
      }
    },
    "log_stream_name": "cloudwatch_log_stream"
  },
  "metrics": {
    "metrics_collected": {
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 15,
        "metrics_aggregation_interval": 15
      }
    }
  }
}
EOF

sudo mv config.json /opt/aws/amazon-cloudwatch-agent/bin/
# sudo yum install npm
# sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-5.noarch.rpm
# sudo yum install -y mysql-community-server
# sudo systemctl start mysqld
# sudo systemctl enable mysqld
# passwords=$(sudo grep 'temporary password' /var/log/mysqld.log | awk {'print $13'})
# mysql -u root -p$passwords --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Sreeja@123';"
# mysql -u root -pSreeja@123 -e "create database cloudDB;"

# sudo mysql -u root -pSreeja@123 <<EOF
# CREATE USER 'sreeja'@'localhost' IDENTIFIED BY 'Sreeja@123';
# GRANT ALL PRIVILEGES ON cloudDB.* TO 'sreeja'@'localhost' WITH GRANT OPTION;
# FLUSH PRIVILEGES;
# EOF

# echo 'export DB=cloudDB' >> ~/.bashrc
# echo 'export USER=sreeja' >> ~/.bashrc
# echo 'export PASSWORD=Sreeja@123' >> ~/.bashrc
# echo 'export HOST=localhost' >> ~/.bashrc

mkdir webapp
mv webapp.zip webapp/
cd webapp
unzip webapp.zip
rm webapp.zip
# cd webapp
npm install
mkdir uploads
cd ..
sudo chmod 755 webapp
# touch webapp.service
# cat <<EOF >> webapp.service
# [Unit]
# Description=Webapp Service
# After=network.target

# [Service]
# Environment="DB=cloudDB"
# Environment="USER=sreeja"
# Environment="PASSWORD=Sreeja@123"
# Environment="HOST=localhost"
# Type=simple
# User=ec2-user
# WorkingDirectory=/home/ec2-user/webapp
# ExecStart=/usr/bin/node server.js
# Restart=on-failure

# [Install]
# WantedBy=multi-user.target
# EOF
# sudo mv webapp.service /etc/systemd/system/
# sudo systemctl daemon-reload
# sudo systemctl start webapp.service
# sudo systemctl status webapp.service
# sudo systemctl enable webapp.service

