create table Login (
userId INT Identity(1,1) Primary Key
)

create table AgentFilter(
agentId INT Identity(1,1) Primary Key,
agentName varchar(100) NOT NULL, 
agentSpecial varchar(255)
)

create table Backlog(
taskid INT Identity(1,1) Primary Key,
userId INT NOT NULL,
status varchar(240) CHECK (status IN ('toDo', 'progress', 'review', 'done', 'cancel')) ,
title varchar(255) NOT NULL,
description nvarchar(max),
priority varchar(10) CHECK (priority IN('low', 'medium', 'high')),
requirements nvarchar(max),
acceptCrit nvarchar(max),
agentId INT NOT NULL,
repo varchar(max),
agentProcess varchar(max)

FOREIGN KEY (userId) References Login(userId),
FOREIGN KEY (agentId) References AgentFilter(agentId)
)

