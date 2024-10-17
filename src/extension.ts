import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    //Создание статус бара с командой extension.showTime
    const timeStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    timeStatusBarItem.command = 'extension.showTime';
    timeStatusBarItem.tooltip = 'Click to show the current system time';
    timeStatusBarItem.show();

    let DeadlineDate: Date | null = loadDeadlineDate(context); //дата дедлайна
    
    const imagePath = path.join(context.extensionPath, 'images', 'kot mem.jpg');// путь к котику
    // форматирование времени
    const formatTime = (time: number): string => {
        return time < 10 ? `0${time}` : time.toString();
    };
    // вывод уведомления о скором завершении дедлайна
    const checkDeadlineNotification = () => {
        if (DeadlineDate) {
            const currentTime = new Date();
            const timeDifference = DeadlineDate.getTime() - currentTime.getTime();

            if (timeDifference <= 10 * 60 * 60 * 1000 && timeDifference > 9 * 60 * 60 * 1000) {    
                vscode.window.showInformationMessage("Deadline will occur in 10 hours!");
            } else if (timeDifference <= 60 * 60 * 1000 && timeDifference > 59 * 60 * 1000) {    
                vscode.window.showInformationMessage("Deadline will occur in 1 hour O.o");
            }
        }
    };
    //обновление времени
    const updateTime = () => {
        const currentTime = new Date();
        const currentTimeString = currentTime.toLocaleTimeString();
        // вывод оставшегося времени до дд, если он есть
        if (DeadlineDate) {
            const timeDifference = DeadlineDate.getTime() - currentTime.getTime();
            if (timeDifference > 0) {
                const daysLeft = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
                const hoursLeft = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
                const secondsLeft = Math.floor((timeDifference % (1000 * 60)) / 1000);

                const timeUntilDeadline = `${daysLeft}d ${formatTime(hoursLeft)}:${formatTime(minutesLeft)}:${formatTime(secondsLeft)}`;

                timeStatusBarItem.text = `$(clock) ${timeUntilDeadline} until Deadline`;

                checkDeadlineNotification();
            } else {
                timeStatusBarItem.text = `$(check) Deadline is over:(`;

                vscode.commands.executeCommand('extension.showImage');
                removeDeadlineDate(context);
            }
        } else {
            timeStatusBarItem.text = `$(alert) Set a new Deadline`;
        }
    };

    setInterval(updateTime, 1000);
    //вывод текущего времени
    let disposableShowTime = vscode.commands.registerCommand('extension.showTime', () => {
        const currentTime = new Date().toLocaleTimeString();
        vscode.window.showInformationMessage(`Current system time is: ${currentTime}`);
    });
    // ввод дедлайна
    let disposableSetDeadline = vscode.commands.registerCommand('extension.setDeadline', async () => {
        const input = await vscode.window.showInputBox({
            placeHolder: 'Enter the Deadline (DD-MM HH:mm:ss)',
            validateInput: (value: string) => {
                const regex = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
                if (!regex.test(value)) {
                    return 'Invalid format. Please use DD-MM HH:mm:ss';
                }
                return null;
            }
        });
        // парсинг строки даты
        if (input) {
            const currentYear = new Date().getFullYear();
            const [data, time] = input.split(' ');
            const [day, month] = data.split('-');
            const [hour, minute,seconds] = time.split(':');

            const DeadlineString = `${currentYear}-${month}-${day}T${hour}:${minute}:${seconds}`;

            const parsedDate = new Date(DeadlineString);
            if (!isNaN(parsedDate.getTime())) {
                DeadlineDate = parsedDate;
                saveDeadlineDate(context, DeadlineDate);
                vscode.window.showInformationMessage(`Deadline date set to: ${DeadlineDate.toLocaleString()}`);
            } else {
                vscode.window.showErrorMessage('Invalid date/time input!');
            }
        }
    });

    context.subscriptions.push(disposableShowTime);
    context.subscriptions.push(disposableSetDeadline);
    //вывод котика
    let disposableShowImage = vscode.commands.registerCommand('extension.showImage', () => {
        const panel = vscode.window.createWebviewPanel(
            'DeadlineImage',
            'Deadline Image',
            vscode.ViewColumn.One,
            {}
        );

        const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(imagePath));
        panel.webview.html = `<html><body><img src="${imageUri}" style="max-width:100%;max-height:100%"></body></html>`;

        removeDeadlineDate(context);
    });

    context.subscriptions.push(disposableShowImage);
    //удаление дедлайна из кеша
    function removeDeadlineDate(context: vscode.ExtensionContext) {
        DeadlineDate = null;
        context.globalState.update('DeadlineDate', null);
    }
    //сохранение дедлайна в кеш
    function saveDeadlineDate(context: vscode.ExtensionContext, DeadlineDate: Date) {
        context.globalState.update('DeadlineDate', DeadlineDate.toISOString());
    }
    //загрузка дедлайна в кеш
    function loadDeadlineDate(context: vscode.ExtensionContext): Date | null {
        const savedDate = context.globalState.get<string>('DeadlineDate');
        return savedDate ? new Date(savedDate) : null;
    }
}

export function deactivate() {}
