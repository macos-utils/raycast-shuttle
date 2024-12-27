import { ActionPanel, Action, Icon, List, Color } from "@raycast/api"
import { runAppleScript } from "@raycast/utils"
import { homedir } from "os"
import fs from "fs"
import path from "path"


const configFilePath = path.join(homedir(), ".shuttle.json")
const configData = fs.readFileSync(configFilePath, "utf-8")
const config = JSON.parse(configData)

let hosts = [];

function processList(list, path = []) {
    if (!Array.isArray(list)) {
        return
    }

    for (let item of list) {
        processItem(path, item)
    }
}

function processItem(path, item) {
    if (item.name && item.cmd) {
        hosts.push({
            'name': item.name,
            'cmd': item.cmd,
            'path': path,
            'comment': item.cmd.substring(item.cmd.indexOf('#') + 1).trim(),
            'ip': item.cmd.match(/@([\.\w\d]+)?/)[1],
            'user': item.cmd.match(/\s([\w\d]+)@/)[1]
        })

        return
    }

    for (let [key, value] of Object.entries(item)) {
        processList(value, path.concat([key]))
    }
}

processList(config.hosts)



async function runInTerminal(item) {
    await runAppleScript(
        `
    -- Set this property to true to open in a new window instead of a new tab
      property open_in_new_window : false

    on new_window()
    	tell application "iTerm" to create window with default profile
    end new_window

    on new_tab()
    	tell application "iTerm" to tell the first window to create tab with default profile
    end new_tab

    on call_forward()
    	tell application "iTerm" to activate
    end call_forward

    on is_running()
    	application "iTerm" is running
    end is_running

    on is_processing()
    	tell application "iTerm" to tell the first window to tell current session to get is processing
    end is_processing

    on has_windows()
    	if not is_running() then return false
    	if windows of application "iTerm" is {} then return false
    	true
    end has_windows

    on send_text(custom_text)
    	tell application "iTerm" to tell the first window to tell current session to write text custom_text
    end send_text

    -- Main
    if has_windows() then
      if open_in_new_window then
        new_window()
      else
        new_tab()
      end if
    else
    	-- If iTerm is not running and we tell it to create a new window, we get two
    	-- One from opening the application, and the other from the command
    	if is_running() then
    		new_window()
    	else
    		call_forward()
    	end if
    end if

    -- Make sure a window exists before we continue, or the write may fail
    repeat until has_windows()
    	delay 0.01
    end repeat

    send_text("${item.cmd}")
    call_forward()
`)
}

export default function Command() {
    return (
        <List>
            {hosts.map((item, key) => (
                <List.Item
                    key={key}
                    icon="terminal.png"
                    title={item.path.concat([item.name]).join(' / ')}
                    subtitle={item.ip}
                    accessories={[{ tag: { value: item.user, color: Color.SecondaryText } }]}
                    keywords={item.path.concat([item.name, item.cmd, item.ip])}
                    actions={
                        < ActionPanel >
                            <Action title="Open in iTerm" onAction={async () => {
                                await runInTerminal(item)
                            }} />
                            <Action.CopyToClipboard
                                title="Copy Password"
                                content={item.comment}
                                shortcut={{ modifiers: ["cmd"], key: "c" }}
                                concealed
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List >
    )
}
