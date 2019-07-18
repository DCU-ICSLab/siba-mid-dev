
CREATE TABLE alog
(
	alog_time            TIMESTAMP NOT NULL,
	alog_res             TINYINT NULL,
	dev_mac              CHAR(17) NOT NULL
);


ALTER TABLE alog
ADD PRIMARY KEY (alog_time,dev_mac);



CREATE TABLE clog
(
	clog_time            TIMESTAMP NOT NULL,
	clog_res             TINYINT NULL,
	dev_mac              CHAR(17) NOT NULL
);



ALTER TABLE clog
ADD PRIMARY KEY (clog_time,dev_mac);



CREATE TABLE dev
(
	dev_mac              CHAR(17) NOT NULL,
	dev_type             CHAR(32) NULL,
    dev_status             TINYINT NULL
);



ALTER TABLE dev
ADD PRIMARY KEY (dev_mac);



ALTER TABLE alog
ADD FOREIGN KEY R_7 (dev_mac) REFERENCES dev (dev_mac);



ALTER TABLE clog
ADD FOREIGN KEY R_6 (dev_mac) REFERENCES dev (dev_mac);

