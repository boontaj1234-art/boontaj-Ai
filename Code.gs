
const SPREADSHEET_ID = '1lB4t4Ml5evxFA51T4cHT81YeqpqSnoZZj2TrrOWHUBc';
const CERTS_ROOT_FOLDER_ID = '1P1n2l5MF42FC65t1JCNAGY-vHrUYYO8X';

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  try {
    if (action === 'getAccounts') {
      const sheet = ss.getSheetByName('user');
      const data = sheet.getDataRange().getValues();
      const acc = {};
      for(let i=1; i<data.length; i++) {
        acc[data[i][0]] = { name: data[i][1], username: data[i][2], password: data[i][3] };
      }
      return createJsonResponse(acc);
    }
    
    if (action === 'getSports') {
      const sheet = getOrCreateSheet(ss, 'sportsname');
      const data = sheet.getDataRange().getValues();
      const sports = data.slice(1).map(r => {
        const rulesPdfParts = r.slice(3, 63);
        const templateParts = r.slice(63, 123);
        const fullRulesPdf = rulesPdfParts.join('');
        const fullTemplate = templateParts.join('');
        
        return { 
          id: String(r[0]).trim(), 
          name: String(r[1]).trim(), 
          description: r[2] || '', 
          rulesPdf: fullRulesPdf,
          certTemplate: fullTemplate,
          category: 'กีฬา', 
          icon: 'Trophy' 
        };
      });
      return createJsonResponse(sports);
    }

    if (action === 'getAthleticsList') {
      const sheet = getOrCreateSheet(ss, 'athletics_list');
      const data = sheet.getDataRange().getValues();
      const athletics = data.slice(1).map(r => ({ 
        id: String(r[0]).trim(), 
        eventNo: r[1] ? String(r[1]).trim() : '',
        name: r[2] ? String(r[2]).trim() : '', 
        description: r[3] ? String(r[3]) : ''
      }));
      return createJsonResponse(athletics);
    }

    if (action === 'getRegistrations') {
      const sheet = getOrCreateSheet(ss, 'registrations');
      const data = sheet.getDataRange().getValues();
      const schoolId = String(e.parameter.schoolId || '').trim();
      const registered = data
        .filter(r => String(r[0]).trim() === schoolId)
        .map(r => String(r[2]).trim()); 
      return createJsonResponse(registered);
    }

    if (action === 'getRegisteredSchoolsForEvent') {
      const sportId = String(e.parameter.sportId || '').trim();
      const ageGroup = String(e.parameter.ageGroup || '').trim().toLowerCase();
      const athleticsEvent = String(e.parameter.athleticsEvent || '').trim().toLowerCase();
      
      const sportsNameSheet = getSportNameById(ss, sportId);
      if (!sportsNameSheet) return createJsonResponse([]);
      const sheet = ss.getSheetByName(sportsNameSheet);
      if (!sheet) return createJsonResponse([]);

      const data = sheet.getDataRange().getValues();
      const schoolMap = {};
      const isAthleticsMode = sportsNameSheet.includes('กรีฑา');

      data.slice(1).forEach(r => {
        const valAge = String(r[7] || '').trim().toLowerCase();
        const valEvent = String(r[22] || '').trim().toLowerCase();
        
        let match = false;
        if (isAthleticsMode) {
          const matchEvent = athleticsEvent ? (valEvent === athleticsEvent) : true;
          const matchAge = ageGroup ? (valAge === ageGroup) : true;
          match = matchEvent && matchAge;
        } else {
          match = ageGroup ? (valAge === ageGroup) : false;
        }
        
        if (match) {
          schoolMap[String(r[0]).trim()] = String(r[1]).trim();
        }
      });
      
      const schools = Object.keys(schoolMap).map(id => ({ id: id, name: schoolMap[id] }));
      return createJsonResponse(schools);
    }

    if (action === 'getResults') {
      const sheet = getOrCreateSheet(ss, 'results');
      const data = sheet.getDataRange().getValues();
      const results = data.slice(1).map(r => ({
        id: String(r[0]).trim(),
        sportId: String(r[1]).trim(),
        sportName: String(r[2]).trim(),
        ageGroup: String(r[3]).trim(),
        athleticsEvent: String(r[4]).trim(),
        rank1SchoolId: String(r[5]).trim(),
        rank1SchoolName: String(r[6]).trim(),
        rank2SchoolId: String(r[7]).trim(),
        rank2SchoolName: String(r[8]).trim(),
        rank3SchoolId: String(r[9]).trim(),
        rank3SchoolName: String(r[10]).trim(),
        certStartNo: r[13] || '', 
        certEndNo: r[14] || '',   
        certTemplate: r[15] || '', 
        isPublished: r[12] === true || r[12] === 'true'
      }));
      return createJsonResponse(results);
    }

    if (action === 'getAthletes') {
      const sportId = String(e.parameter.sportId || '').trim();
      const schoolId = String(e.parameter.schoolId || '').trim();
      const ageGroup = String(e.parameter.ageGroup || '').trim();
      const athleticsEvent = String(e.parameter.athleticsEvent || '').trim();
      
      const sportsNameSheet = getSportNameById(ss, sportId);
      if (!sportsNameSheet) return createJsonResponse([]);
      
      const sheet = ss.getSheetByName(sportsNameSheet);
      if (!sheet) return createJsonResponse([]);
      
      const data = sheet.getDataRange().getValues();
      const athletes = data.filter(r => {
        const rowSchoolId = String(r[0]).trim();
        const rowAgeGroup = String(r[7] || '').trim();
        const rowEvent = String(r[22] || '').trim();
        
        const matchSchool = rowSchoolId === schoolId;
        const matchAge = ageGroup ? rowAgeGroup === ageGroup : true;
        const matchEvent = athleticsEvent ? rowEvent === athleticsEvent : true;
        
        return matchSchool && matchAge && matchEvent;
      }).map(r => ({
        prefix: r[4],
        firstName: r[5],
        lastName: r[6],
        ageGroup: r[7],
        avatar: r[8],
        coach1Prefix: r[9], coach1First: r[10], coach1Last: r[11], coach1Phone: r[12],
        coach2Prefix: r[13], coach2First: r[14], coach2Last: r[15], coach2Phone: r[16],
        coach3Prefix: r[17], coach3First: r[18], coach3Last: r[19], coach3Phone: r[20],
        athleticsEvent: r[22] || ''
      }));
      return createJsonResponse(athletes);
    }

    if (action === 'getAgeGroups') {
      const data = getOrCreateSheet(ss, 'age_groups').getDataRange().getValues();
      return createJsonResponse(data.slice(1).map(r => ({id: String(r[0]).trim(), age: String(r[1]).trim(), gender: String(r[2]).trim()})));
    }

    if (action === 'getSchoolProfile') {
      const sheet = getOrCreateSheet(ss, 'school_profiles');
      const data = sheet.getDataRange().getValues();
      const schoolId = String(e.parameter.schoolId || '').trim();
      let profile = { schoolId: schoolId, directorName: '', schoolColors: '', staffCount: '', motto: '', phoneNumber: '', logo: '' };
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === schoolId) {
          profile = { schoolId: String(data[i][0]).trim(), directorName: data[i][1], schoolColors: data[i][2], staffCount: data[i][3], motto: data[i][4], phoneNumber: data[i][5], logo: data[i][6] };
          break;
        }
      }
      return createJsonResponse(profile);
    }
    
    return createJsonResponse({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const d = payload.data;

    if (action === 'updateSport') {
      const id = String(d.id).trim();
      const newName = String(d.name).trim();
      const oldName = getSportNameById(ss, id);
      
      // Cascading Name Change
      if (oldName && oldName !== newName) {
        // 1. Rename individual athlete sheet
        const targetSheet = ss.getSheetByName(oldName);
        if (targetSheet) {
          targetSheet.setName(newName);
          // อัปเดตคอลัมน์ sportName (Col D / Index 3) ในชีตนั้นด้วย
          updateColumnValueByCriteria(ss, newName, 2, id, 3, newName);
        }
        
        // 2. Update Registrations (Col C เป็น sportId, Col D เป็น sportName)
        updateColumnValueByCriteria(ss, 'registrations', 2, id, 3, newName);
        
        // 3. Update Results (Col B เป็น sportId, Col C เป็น sportName)
        updateColumnValueByCriteria(ss, 'results', 1, id, 2, newName);
        
        // 4. Update Issued Certificates (Col F เป็น sportName)
        updateColumnValueByCriteria(ss, 'certificates_issued', 5, oldName, 5, newName);
      }

      const fullTemplate = d.certTemplate || '';
      const fullRulesPdf = d.rulesPdf || '';
      const chunkSize = 50000;
      const numChunks = 60; 
      
      const rulesChunks = [];
      const certChunks = [];
      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        rulesChunks.push(fullRulesPdf.substring(start, end));
        certChunks.push(fullTemplate.substring(start, end));
      }
      
      const rowData = [id, newName, d.description, ...rulesChunks, ...certChunks];
      updateOrInsertRow(getOrCreateSheet(ss, 'sportsname'), id, rowData);
      return createJsonResponse({ status: 'success' });
    }

    if (action === 'deleteSport') {
      const sportId = String(d.id).trim();
      const oldName = getSportNameById(ss, sportId);
      
      // Cascading Delete
      if (oldName) {
        const targetSheet = ss.getSheetByName(oldName);
        if (targetSheet) ss.deleteSheet(targetSheet);
      }
      
      deleteRowsByColumnValue(ss, 'registrations', 2, sportId);
      
      const resultsSheet = ss.getSheetByName('results');
      if (resultsSheet) {
        const resData = resultsSheet.getDataRange().getValues();
        for (let i = resData.length - 1; i >= 1; i--) {
          if (String(resData[i][1]).trim() === sportId) {
            const resultId = String(resData[i][0]).trim();
            deleteRowsByColumnValue(ss, 'certificates_issued', 0, resultId);
            resultsSheet.deleteRow(i + 1);
          }
        }
      }
      
      deleteRowById(ss, 'sportsname', sportId);
      return createJsonResponse({ status: 'success' });
    }

    if (action === 'saveRegistration') {
      const regSheet = getOrCreateSheet(ss, 'registrations');
      const currentData = regSheet.getDataRange().getValues();
      const schoolIdStr = String(d.schoolId).trim();
      
      const previousSportIds = [];
      for (let i = 1; i < currentData.length; i++) {
        if (String(currentData[i][0]).trim() === schoolIdStr) {
          previousSportIds.push(String(currentData[i][2]).trim());
        }
      }

      const newSportIds = d.items.map(item => String(item.sportId).trim());
      const removedIds = previousSportIds.filter(id => !newSportIds.includes(id));

      removedIds.forEach(id => {
        const sportName = getSportNameById(ss, id);
        if (sportName) {
          const athleteSheet = ss.getSheetByName(sportName);
          if (athleteSheet) {
            const athData = athleteSheet.getDataRange().getValues();
            for (let j = athData.length - 1; j >= 1; j--) {
              if (String(athData[j][0]).trim() === schoolIdStr) {
                athleteSheet.deleteRow(j + 1);
              }
            }
          }
        }
      });

      for (let i = currentData.length - 1; i >= 1; i--) {
        if (String(currentData[i][0]).trim() === schoolIdStr) {
          regSheet.deleteRow(i + 1);
        }
      }
      const timestamp = new Date();
      d.items.forEach(item => {
        regSheet.appendRow([schoolIdStr, d.schoolName, String(item.sportId).trim(), item.sportName, timestamp]);
      });
      return createJsonResponse({ status: 'success' });
    }

    if (action === 'saveAthletes') {
      const sheetName = d.sportName;
      let sportSheet = ss.getSheetByName(sheetName);
      if (!sportSheet) {
        sportSheet = ss.insertSheet(sheetName);
        sportSheet.appendRow([
          'schoolId', 'schoolName', 'sportId', 'sportName', 
          'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'รุ่นอายุ', 'รูปภาพ', 
          'ผู้ฝึกสอน1_คำนำหน้า', 'ผู้ฝึกสอน1_ชื่อ', 'ผู้ฝึกสอน1_นามสกุล', 'ผู้ฝึกสอน1_เบอร์โทร',
          'ผู้ฝึกสอน2_คำนำหน้า', 'ผู้ฝึกสอน2_ชื่อ', 'ผู้ฝึกสอน2_นามสกุล', 'ผู้ฝึกสอน2_เบอร์โทร',
          'ผู้ฝึกสอน3_คำนำหน้า', 'ผู้ฝึกสอน3_ชื่อ', 'ผู้ฝึกสอน3_นามสกุล', 'ผู้ฝึกสอน3_เบอร์โทร',
          'timestamp', 'รายการแข่งขัน'
        ]);
        sportSheet.getRange(1, 1, 1, 23).setBackground('#0ea5e9').setFontColor('#ffffff').setFontWeight('bold');
      }

      const data = sportSheet.getDataRange().getValues();
      const targetAgeGroup = d.athletes[0] ? String(d.athletes[0].ageGroup).trim() : '';
      const athleticsEvent = d.athleticsEvent ? String(d.athleticsEvent).trim() : '';
      const schoolIdStr = String(d.schoolId).trim();

      for (let i = data.length - 1; i >= 1; i--) {
        const rowSchoolId = String(data[i][0]).trim();
        const rowAgeGroup = String(data[i][7]).trim();
        const rowEvent = (data[i][22] || '').toString().trim();
        const matchSchool = rowSchoolId === schoolIdStr;
        const matchAge = targetAgeGroup ? (rowAgeGroup === targetAgeGroup) : true;
        const matchEvent = athleticsEvent ? (rowEvent === athleticsEvent) : true;
        if (matchSchool && matchAge && matchEvent) {
          sportSheet.deleteRow(i + 1);
        }
      }

      const timestamp = new Date();
      const coaches = d.coaches;
      if (d.athletes && d.athletes.length > 0) {
        d.athletes.forEach(ath => {
          sportSheet.appendRow([
            schoolIdStr, d.schoolName, String(d.sportId).trim(), d.sportName,
            ath.prefix, ath.firstName, ath.lastName, ath.ageGroup, ath.avatar || '',
            coaches.coach1Prefix, coaches.coach1First, coaches.coach1Last, coaches.coach1Phone || '',
            coaches.coach2Prefix, coaches.coach2First, coaches.coach2Last, coaches.coach2Phone || '',
            coaches.coach3Prefix, coaches.coach3First, coaches.coach3Last, coaches.coach3Phone || '',
            timestamp, athleticsEvent || ''
          ]);
        });
      }
      return createJsonResponse({ status: 'success' });
    }

    if (action === 'updateResult') {
      const id = String(d.id).trim();
      const rowValues = [
        id, String(d.sportId).trim(), d.sportName, d.ageGroup || '', d.athleticsEvent || '',
        String(d.rank1SchoolId).trim(), d.rank1SchoolName,
        String(d.rank2SchoolId).trim(), d.rank2SchoolName,
        String(d.rank3SchoolId).trim(), d.rank3SchoolName,
        new Date(), d.isPublished ? true : false,
        d.certStartNo || '', d.certEndNo || '', d.certTemplate || '' 
      ];
      updateOrInsertRow(getOrCreateSheet(ss, 'results'), id, rowValues);
      return createJsonResponse({ status: 'success' });
    }

    if (action === 'updateCertConfig') {
      const resultId = String(d.id).trim();
      const sheet = getOrCreateSheet(ss, 'results');
      const data = sheet.getDataRange().getValues();
      let foundRow = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === resultId) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow !== -1) {
        sheet.getRange(foundRow, 14).setValue(d.certStartNo || ''); 
        sheet.getRange(foundRow, 15).setValue(d.certEndNo || '');   
        const allCertsSheet = getOrCreateSheet(ss, 'certificates_issued');
        const certsData = allCertsSheet.getDataRange().getValues();
        for (let i = certsData.length - 1; i >= 1; i--) {
          if (String(certsData[i][0]).trim() === resultId) {
            allCertsSheet.deleteRow(i + 1);
          }
        }
        if (d.records && d.records.length > 0) {
          const timestamp = new Date();
          d.records.forEach(rec => {
            allCertsSheet.appendRow([
              resultId, rec.certNo, rec.fullName, rec.schoolName, rec.rank, rec.sportName, rec.ageGroup, rec.athleticsEvent, timestamp
            ]);
          });
        }
        return createJsonResponse({ status: 'success' });
      }
      return createJsonResponse({ status: 'error', message: 'Result ID not found' });
    }

    if (action === 'deleteResult') {
      deleteRowById(ss, 'results', d.id);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'deleteAccount') {
      const schoolId = String(d.id).trim();
      
      // Cascading Delete for School
      // 1. ลบจากชีตลงทะเบียน และรวบรวมรายชื่อกีฬาเพื่อไปลบนักกีฬาในชีตแยก
      const regSheet = ss.getSheetByName('registrations');
      if (regSheet) {
        const regData = regSheet.getDataRange().getValues();
        const sportsToClean = [];
        for (let i = regData.length - 1; i >= 1; i--) {
          if (String(regData[i][0]).trim() === schoolId) {
            sportsToClean.push(String(regData[i][3]).trim()); // คอลัมน์ D คือชื่อกีฬา
            regSheet.deleteRow(i + 1);
          }
        }
        
        // 2. ลบรายชื่อนักกีฬาในแต่ละแผ่นงานกีฬา
        sportsToClean.forEach(sheetName => {
          const s = ss.getSheetByName(sheetName);
          if (s) {
            const sData = s.getDataRange().getValues();
            for (let j = sData.length - 1; j >= 1; j--) {
              if (String(sData[j][0]).trim() === schoolId) {
                s.deleteRow(j + 1);
              }
            }
          }
        });
      }

      // 3. ลบจากโปรไฟล์โรงเรียน
      deleteRowById(ss, 'school_profiles', schoolId);

      // 4. ลบจากบัญชีผู้ใช้
      deleteRowById(ss, 'user', schoolId);
      
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'updateAccount') {
      const id = String(d.id).trim();
      const newName = String(d.name).trim();
      
      // ค้นหาชื่อเก่าเพื่อทำ Cascading Update
      const userSheet = ss.getSheetByName('user');
      let oldName = "";
      if (userSheet) {
        const userData = userSheet.getDataRange().getValues();
        for (let i = 1; i < userData.length; i++) {
          if (String(userData[i][0]).trim() === id) {
            oldName = String(userData[i][1]).trim();
            break;
          }
        }
      }

      // หากมีการเปลี่ยนชื่อโรงเรียน ให้ตามไปแก้ในจุดอื่นๆ
      if (oldName && oldName !== newName) {
        // 1. ชีตลงทะเบียน
        updateColumnValueByCriteria(ss, 'registrations', 0, id, 1, newName);
        
        // 2. ชีตรายชื่อนักกีฬาของทุกกีฬาที่ลงทะเบียนไว้
        const regSheet = ss.getSheetByName('registrations');
        if (regSheet) {
          const regData = regSheet.getDataRange().getValues();
          const sportsToUpdate = [];
          for (let i = 1; i < regData.length; i++) {
            if (String(regData[i][0]).trim() === id) {
              sportsToUpdate.push(String(regData[i][3]).trim());
            }
          }
          sportsToUpdate.forEach(sheetName => {
            updateColumnValueByCriteria(ss, sheetName, 0, id, 1, newName);
          });
        }
        
        // 3. ชีตผลการแข่งขัน (อันดับ 1, 2, 3)
        const resultsSheet = ss.getSheetByName('results');
        if (resultsSheet) {
          const resultsData = resultsSheet.getDataRange().getValues();
          for (let i = 1; i < resultsData.length; i++) {
            if (String(resultsData[i][5]).trim() === id) resultsSheet.getRange(i + 1, 7).setValue(newName);
            if (String(resultsData[i][7]).trim() === id) resultsSheet.getRange(i + 1, 9).setValue(newName);
            if (String(resultsData[i][9]).trim() === id) resultsSheet.getRange(i + 1, 11).setValue(newName);
          }
        }
        
        // 4. ชีตประวัติเกียรติบัตร
        updateColumnValueByCriteria(ss, 'certificates_issued', 3, oldName, 3, newName);
      }

      updateOrInsertRow(getOrCreateSheet(ss, 'user'), id, [id, newName, d.username, d.password]);
      return createJsonResponse({ status: 'success' });
    }

    if (action === 'deleteAgeGroup') {
      deleteRowById(ss, 'age_groups', d.id);
      return createJsonResponse({ status: 'success' });
    }
    if (action === 'deleteAthletics') {
      deleteRowById(ss, 'athletics_list', d.id);
      return createJsonResponse({ status: 'success' });
    }
    if (action === 'updateSchoolProfile') {
      const schoolIdStr = String(d.schoolId).trim();
      updateOrInsertRow(getOrCreateSheet(ss, 'school_profiles'), schoolIdStr, [schoolIdStr, d.directorName, d.schoolColors, d.staffCount, d.motto, d.phoneNumber, d.logo]);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'updateAgeGroup') {
      const id = String(d.id).trim();
      updateOrInsertRow(getOrCreateSheet(ss, 'age_groups'), id, [id, d.age, d.gender]);
      return createJsonResponse({ status: 'success' });
    }
    if (action === 'updateAthletics') {
      const id = String(d.id).trim();
      const rowData = [id, "'" + d.eventNo, d.name, d.description];
      updateOrInsertRow(getOrCreateSheet(ss, 'athletics_list'), id, rowData);
      return createJsonResponse({ status: 'success' });
    }
    
    return createJsonResponse({ status: 'error', message: 'Invalid POST action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function getSportNameById(ss, id) {
  const sheet = ss.getSheetByName('sportsname');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const idStr = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === idStr) return String(data[i][1]).trim();
  }
  return null;
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'registrations') {
      sheet.appendRow(['schoolId', 'schoolName', 'sportId', 'ชื่อกีฬา', 'timestamp']);
    } else if (name === 'sportsname') {
      const headers = ['id', 'name', 'description'];
      for (let i = 1; i <= 60; i++) headers.push('rulesPdfPart' + i);
      for (let i = 1; i <= 60; i++) headers.push('certTemplatePart' + i);
      sheet.appendRow(headers);
    } else if (name === 'athletics_list') {
      sheet.appendRow(['id', 'ที่', 'รายการแข่งขัน', 'description']);
      sheet.getRange("B:B").setNumberFormat("@");
    } else if (name === 'results') {
      sheet.appendRow(['id', 'sportId', 'sportName', 'ageGroup', 'athleticsEvent', 'rank1Id', 'rank1Name', 'rank2Id', 'rank2Name', 'rank3Id', 'rank3Name', 'timestamp', 'isPublished', 'certStartNo', 'certEndNo', 'certTemplate']);
    } else if (name === 'certificates_issued') {
      sheet.appendRow(['resultId', 'เลขที่เกียรติบัตร', 'ชื่อ-นามสกุล', 'โรงเรียน', 'อันดับ', 'กีฬา', 'รุ่นอายุ', 'รายการกรีฑา', 'บันทึกเมื่อ']);
      sheet.getRange(1, 1, 1, 9).setBackground('#f43f5e').setFontColor('#ffffff').setFontWeight('bold');
    }
  }
  return sheet;
}

function updateOrInsertRow(sheet, id, rowData) {
  const data = sheet.getDataRange().getValues();
  const idStr = String(id).trim();
  let found = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === idStr) { 
      found = i + 1; 
      break; 
    }
  }
  if (found !== -1) {
    sheet.getRange(found, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function deleteRowById(ss, sheetName, id) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const idStr = String(id).trim();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === idStr) {
      sheet.deleteRow(i + 1);
    }
  }
}

function deleteRowsByColumnValue(ss, sheetName, colIndex, value) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const valStr = String(value).trim();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIndex]).trim() === valStr) {
      sheet.deleteRow(i + 1);
    }
  }
}

function updateColumnValueByCriteria(ss, sheetName, searchColIndex, searchValue, updateColIndex, newValue) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const sVal = String(searchValue).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][searchColIndex]).trim() === sVal) {
      sheet.getRange(i + 1, updateColIndex + 1).setValue(newValue);
    }
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
