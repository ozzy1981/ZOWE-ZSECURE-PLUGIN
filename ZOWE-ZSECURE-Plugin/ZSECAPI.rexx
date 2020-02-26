/* Rexx */
/*Rexx to issue RACF commands via TSO API */

address TSO

myrc = IRRXUTIL("EXTRACT","_SETROPTS","_SETROPTS","RES")
say ""                                                                          
say ""                                                                          
say ""                                                                          
if (word(myrc,1)<>0) then do                                                    
   say "MYRC="myrc                                                              
   say "An IRRXUTIL or R_admin error occurred "                                 
   exit 1                                                                       
end    
