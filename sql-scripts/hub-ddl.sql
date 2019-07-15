
CREATE TABLE ap
(
	state                boolean NULL,
	mac                  CHAR(17) NOT NULL
);



ALTER TABLE ap
ADD PRIMARY KEY (mac);



CREATE TABLE dev
(
	dev_mac              CHAR(17) NOT NULL,
	cur_ip               VARCHAR(15) NULL,
	dev_type             VARCHAR(30) NULL,
	mac                  CHAR(17) NOT NULL
);



ALTER TABLE dev
ADD PRIMARY KEY (dev_mac);



CREATE TABLE hub
(
	mac                  CHAR(17) NOT NULL,
	cur_ip               VARCHAR(15) NULL,
	prev_ip              VARCHAR(15) NULL,
	upnp_port            INTEGER NULL,
	is_reg               boolean NULL,
	reg_date             DATE NULL
);



ALTER TABLE hub
ADD PRIMARY KEY (mac);



CREATE TABLE rf
(
	state                boolean NULL,
	mac                  CHAR(17) NOT NULL
);



ALTER TABLE rf
ADD PRIMARY KEY (mac);



CREATE TABLE user
(
	id                   INTEGER NOT NULL,
	role_type            VARCHAR(5) NULL,
	mac                  CHAR(17) NOT NULL
);



ALTER TABLE user
ADD PRIMARY KEY (id);



ALTER TABLE ap
ADD FOREIGN KEY R_1 (mac) REFERENCES hub (mac);



ALTER TABLE dev
ADD FOREIGN KEY R_4 (mac) REFERENCES hub (mac);



ALTER TABLE rf
ADD FOREIGN KEY R_2 (mac) REFERENCES hub (mac);



ALTER TABLE user
ADD FOREIGN KEY R_3 (mac) REFERENCES hub (mac);


