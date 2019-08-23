
function createWorkUnit(data){
  return`
  mutation($ReceivedTime:DateTime $ReportDeadline: DateTime $SentTime: DateTime){
    upsertworkUnit(
      where: {
        workUnitId: ${data.WorkunitId}
      }
      create:{
        appName: "${data.AppName}"
        claimedCredit: ${data.ClaimedCredit}
        cpuTime: ${data.CpuTime}
        elapsedTime: ${data.ElapsedTime}
        exitStatus: ${data.ExitStatus}
        grantedCredit: ${data.GrantedCredit}
        deviceId: ${data.DeviceId}
        deviceName: "${data.DeviceName}"
        workUnitId: ${data.WorkunitId}
        resultId: ${data.ResultId}
        name: "${data.Name}"
        outcome: ${data.Outcome}
        receivedTime: $ReceivedTime
        reportDeadline: $ReportDeadline
        sentTime: $SentTime
        serverState: ${data.ServerState}
        validateState: ${data.ValidateState}
        fileDeleteState: ${data.FileDeleteState}
        power:0
      }
      update:{
        claimedCredit: ${data.ClaimedCredit}
        cpuTime: ${data.CpuTime}
        elapsedTime: ${data.ElapsedTime}
        exitStatus: ${data.ExitStatus}
        grantedCredit: ${data.GrantedCredit}
        outcome: ${data.Outcome}
        receivedTime: $ReceivedTime
        reportDeadline: $ReportDeadline
        sentTime: $SentTime
        serverState: ${data.ServerState}
        validateState: ${data.ValidateState}
        fileDeleteState: ${data.FileDeleteState}
      }
    ){id}
  }`
}

module.exports = createWorkUnit
